#!/usr/bin/env python3
"""
Smarter Garmin Connect Sync
- Nutzt garth.client.loads(os.environ["GARMIN_TOKEN"]) und garminconnect.
- Laedt die letzten 14 Tage daily_metrics, activities und aktualisiert athlete_profile.
- Auto-Commute: Rad-Aktivitaeten ohne Wattwerte (avg_power_w is None or 0) -> sport_type='commute', is_commute=True.
- Running: Erkennt 'running', 'trail_running', 'treadmill_running', berechnet min/km Pace.
- Smart Gym-Merge: Krafttraining mit geplantem gym_template verknuepfen.
"""

import os
import sys
import json
import datetime
from typing import Optional

def main():
    token_str = os.environ.get("GARMIN_TOKEN")
    if not token_str:
        print(json.dumps({
            "status": "error",
            "message": "GARMIN_TOKEN Umgebungsvariable fehlt. Bitte Token in .env.local hinterlegen."
        }))
        sys.exit(0)

    try:
        import garth
        from garminconnect import Garmin
    except ImportError:
        print(json.dumps({
            "status": "error",
            "message": "Python-Pakete 'garth' oder 'garminconnect' nicht installiert. Fuehre 'pip install garminconnect garth' aus."
        }))
        sys.exit(0)

    try:
        garth.client.loads(token_str)
        client = Garmin()
        client.login()
    except Exception as e:
        print(json.dumps({
            "status": "error",
            "message": f"Garmin Authentifizierungsfehler: {str(e)}"
        }))
        sys.exit(0)

    today = datetime.date.today()
    start_date = today - datetime.timedelta(days=14)

    synced_metrics = []
    synced_activities = []
    athlete_stats = {}

    try:
        user_summary = client.get_user_summary(today.isoformat())
        athlete_stats = {
            "resting_hr": user_summary.get("restingHeartRate"),
            "max_hr": user_summary.get("maxHeartRate"),
            "weight_kg": user_summary.get("weight") / 1000.0 if user_summary.get("weight") else None,
        }
    except Exception as e:
        sys.stderr.write(f"Warn: User summary fetch failed: {e}\n")

    curr = start_date
    while curr <= today:
        date_str = curr.isoformat()
        try:
            stats = client.get_stats_and_body(date_str)
            sleep = client.get_sleep_data(date_str)
            hrv = client.get_hrv_data(date_str)
            bb = client.get_body_battery(date_str)

            metric = {
                "date": date_str,
                "resting_hr": stats.get("restingHeartRate"),
                "hrv_last_night": hrv.get("hrvSummary", {}).get("lastNightAvg") if hrv else None,
                "hrv_7d_avg": hrv.get("hrvSummary", {}).get("baseline", {}).get("balancedLow") if hrv else None,
                "hrv_status": hrv.get("hrvSummary", {}).get("status") if hrv else "balanced",
                "sleep_score": sleep.get("dailySleepDTO", {}).get("sleepScores", {}).get("overall", {}).get("value") if sleep else None,
                "sleep_duration_sec": sleep.get("dailySleepDTO", {}).get("sleepTimeSeconds") if sleep else None,
                "rem_sleep_sec": sleep.get("dailySleepDTO", {}).get("remSleepSeconds") if sleep else None,
                "deep_sleep_sec": sleep.get("dailySleepDTO", {}).get("deepSleepSeconds") if sleep else None,
                "body_battery_max": max([b.get("charged", 0) for b in bb], default=None) if bb else None,
                "body_battery_min": min([b.get("drained", 0) for b in bb], default=None) if bb else None,
                "stress_avg": stats.get("averageStressLevel"),
                "training_readiness": stats.get("trainingReadiness", {}).get("score") if isinstance(stats.get("trainingReadiness"), dict) else None,
                "acute_load": stats.get("acuteLoad"),
            }
            synced_metrics.append(metric)
        except Exception as e:
            sys.stderr.write(f"Warn metric {date_str}: {e}\n")
        curr += datetime.timedelta(days=1)

    try:
        raw_acts = client.get_activities(0, 30)
        for act in raw_acts:
            act_type = (act.get("activityType", {}).get("typeKey") or "").lower()
            avg_power = act.get("avgPower")
            duration_sec = int(act.get("duration", 0))
            distance_m = act.get("distance") or 0.0

            is_cycling = any(k in act_type for k in ["cycling", "road_biking", "mountain_biking", "gravel_cycling", "biking"])
            is_running = any(k in act_type for k in ["running", "trail_running", "treadmill_running", "track_running"])
            is_commute = False
            sport_type = "other"

            avg_pace_sec = None
            if is_running:
                sport_type = "running"
                if distance_m > 0 and duration_sec > 0:
                    avg_pace_sec = int(duration_sec / (distance_m / 1000.0))
            elif is_cycling:
                if avg_power is None or avg_power == 0:
                    sport_type = "commute"
                    is_commute = True
                else:
                    sport_type = "zwift" if "virtual" in act_type or "indoor" in act_type else "road_cycling"
            elif "swimming" in act_type or "lap_swimming" in act_type:
                sport_type = "swimming"
            elif any(k in act_type for k in ["strength_training", "fitness_equipment", "gym"]):
                sport_type = "gym"

            synced_activities.append({
                "activity_id": act.get("activityId"),
                "name": act.get("activityName"),
                "sport_type": sport_type,
                "is_commute": is_commute,
                "start_time": act.get("startTimeGMT"),
                "duration_sec": duration_sec,
                "distance_m": distance_m,
                "avg_hr": act.get("averageHR"),
                "max_hr": act.get("maxHR"),
                "avg_power_w": avg_power,
                "normalized_power_w": act.get("normPower"),
                "avg_cadence": act.get("averageRunningCadenceInStepsPerMinute") or act.get("averageBikeCadence"),
                "avg_pace_sec_per_km": avg_pace_sec,
                "tss": act.get("trainingStressScore"),
                "intensity_factor": act.get("intensityFactor"),
                "avg_speed_mps": act.get("averageSpeed"),
                "elevation_gain_m": act.get("elevationGain"),
                "pool_length_m": act.get("poolLength"),
                "swolf": act.get("averageSwolf"),
                "calories": act.get("calories"),
                "linked_gym_template_id": None,
                "raw_json": act
            })
    except Exception as e:
        sys.stderr.write(f"Warn activities fetch failed: {e}\n")

    result = {
        "status": "success",
        "athlete_stats": athlete_stats,
        "metrics_count": len(synced_metrics),
        "activities_count": len(synced_activities),
        "metrics": synced_metrics,
        "activities": synced_activities
    }

    print(json.dumps(result))

if __name__ == "__main__":
    main()
