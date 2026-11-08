#!/usr/bin/env python3
"""
Robust Garmin Connect Sync
- Unterstützt sowohl das neue garminconnect 0.8+ DI-Token Format als auch base64/garth dumps.
- Holt Aktivitäten (inkl. Running mit Pace & Kadenz, Auto-Commute ohne Watt).
- Holt tägliche Metriken (HRV, Sleep, Training Readiness, Body Battery, Acute Load).
"""

import os
import sys
import json
import base64
import datetime
from typing import Optional, Dict, Any, List

try:
    from dotenv import load_dotenv
    load_dotenv(".env.local")
except Exception:
    pass

def init_garmin_client(token_raw: str):
    import garminconnect
    token_str = token_raw.strip().strip('"').strip("'")

    gc = garminconnect.Garmin()

    # 1. Versuche token als JSON oder Base64 zu parsen
    parsed_data = None
    if token_str.startswith("{") or token_str.startswith("["):
        try:
            parsed_data = json.loads(token_str)
        except Exception:
            pass

    if parsed_data is None:
        try:
            decoded = base64.b64decode(token_str).decode("utf-8")
            parsed_data = json.loads(decoded)
        except Exception:
            pass

    if parsed_data is None:
        raise ValueError("Token konnte weder als JSON noch als Base64 decodiert werden.")

    # 2. Extrahiere Token-Felder
    token_obj = parsed_data[0] if isinstance(parsed_data, list) and len(parsed_data) > 0 else parsed_data

    # Neues garminconnect DI Format
    di_token = token_obj.get("di_token") or token_obj.get("access_token")
    di_refresh = token_obj.get("di_refresh_token") or token_obj.get("refresh_token")
    di_client_id = token_obj.get("di_client_id") or token_obj.get("client_id") or "GARMIN_CONNECT_MOBILE_ANDROID_DI"

    if not di_token:
        raise ValueError("Kein valider Access-Token (access_token oder di_token) im Token-Payload gefunden.")

    payload = {
        "di_token": di_token,
        "di_refresh_token": di_refresh,
        "di_client_id": di_client_id,
    }

    gc.client.loads(json.dumps(payload))
    if not gc.client.is_authenticated:
        raise ValueError("Authentifizierung mit dem übergebenen Token fehlgeschlagen.")

    return gc

def main():
    token_str = os.environ.get("GARMIN_TOKEN")
    if not token_str:
        print(json.dumps({
            "status": "error",
            "message": "GARMIN_TOKEN Umgebungsvariable fehlt in .env.local."
        }))
        sys.exit(0)

    try:
        gc = init_garmin_client(token_str)
    except Exception as e:
        print(json.dumps({
            "status": "error",
            "message": f"Garmin Authentifizierungsfehler: {str(e)}"
        }))
        sys.exit(0)

    today = datetime.date.today()
    start_date = today - datetime.timedelta(days=14)

    synced_metrics: List[Dict[str, Any]] = []
    synced_activities: List[Dict[str, Any]] = []
    athlete_stats: Dict[str, Any] = {}

    # 1. Athlete Stats
    try:
        user_summary = gc.get_user_summary(today.isoformat())
        if isinstance(user_summary, dict):
            athlete_stats = {
                "resting_hr": user_summary.get("restingHeartRate"),
                "max_hr": user_summary.get("maxHeartRate"),
                "weight_kg": round(user_summary.get("weight") / 1000.0, 1) if user_summary.get("weight") else None,
            }
    except Exception as e:
        sys.stderr.write(f"Warn: User summary fetch: {e}\n")

    # 2. Letzte 14 Tage Metriken
    curr = start_date
    while curr <= today:
        date_str = curr.isoformat()
        try:
            stats = {}
            try:
                stats = gc.get_stats_and_body(date_str) or {}
            except Exception:
                pass

            sleep = {}
            try:
                sleep = gc.get_sleep_data(date_str) or {}
            except Exception:
                pass

            hrv = {}
            try:
                hrv = gc.get_hrv_data(date_str) or {}
            except Exception:
                pass

            bb = []
            try:
                bb = gc.get_body_battery(date_str) or []
            except Exception:
                pass

            readiness = None
            try:
                tr = gc.get_training_readiness(date_str)
                if isinstance(tr, list) and len(tr) > 0 and isinstance(tr[0], dict):
                    readiness = tr[0].get("score")
                elif isinstance(tr, dict):
                    readiness = tr.get("score")
            except Exception:
                pass

            metric = {
                "date": date_str,
                "resting_hr": stats.get("restingHeartRate") if isinstance(stats, dict) else None,
                "hrv_last_night": hrv.get("hrvSummary", {}).get("lastNightAvg") if isinstance(hrv, dict) else None,
                "hrv_7d_avg": hrv.get("hrvSummary", {}).get("baseline", {}).get("balancedLow") if isinstance(hrv, dict) else None,
                "hrv_status": hrv.get("hrvSummary", {}).get("status", "balanced") if isinstance(hrv, dict) else "balanced",
                "sleep_score": sleep.get("dailySleepDTO", {}).get("sleepScores", {}).get("overall", {}).get("value") if isinstance(sleep, dict) else None,
                "sleep_duration_sec": sleep.get("dailySleepDTO", {}).get("sleepTimeSeconds") if isinstance(sleep, dict) else None,
                "rem_sleep_sec": sleep.get("dailySleepDTO", {}).get("remSleepSeconds") if isinstance(sleep, dict) else None,
                "deep_sleep_sec": sleep.get("dailySleepDTO", {}).get("deepSleepSeconds") if isinstance(sleep, dict) else None,
                "body_battery_max": max([b.get("charged", 0) for b in bb if isinstance(b, dict)], default=None) if isinstance(bb, list) and bb else None,
                "body_battery_min": min([b.get("drained", 0) for b in bb if isinstance(b, dict)], default=None) if isinstance(bb, list) and bb else None,
                "stress_avg": stats.get("averageStressLevel") if isinstance(stats, dict) else None,
                "training_readiness": readiness,
                "acute_load": stats.get("acuteLoad") if isinstance(stats, dict) else None,
            }
            synced_metrics.append(metric)
        except Exception as e:
            sys.stderr.write(f"Warn metric {date_str}: {e}\n")
        curr += datetime.timedelta(days=1)

    # 3. Aktivitäten (letzte 30)
    try:
        raw_acts = gc.get_activities(0, 30)
        for act in raw_acts:
            act_type = (act.get("activityType", {}).get("typeKey") or "").lower()
            avg_power = act.get("avgPower")
            duration_sec = int(act.get("duration", 0))
            distance_m = act.get("distance") or 0.0

            is_cycling = any(k in act_type for k in ["cycling", "road_biking", "mountain_biking", "gravel_cycling", "biking", "virtual_ride"])
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
                "activity_id": str(act.get("activityId")),
                "name": act.get("activityName") or "Aktivität",
                "sport_type": sport_type,
                "is_commute": is_commute,
                "start_time": act.get("startTimeGMT") or f"{today.isoformat()}T00:00:00Z",
                "duration_sec": duration_sec,
                "distance_m": distance_m,
                "avg_hr": act.get("averageHR"),
                "max_hr": act.get("maxHR"),
                "avg_power_w": avg_power,
                "normalized_power_w": act.get("normPower"),
                "avg_cadence": act.get("averageRunningCadenceInStepsPerMinute") or act.get("averageBikeCadence"),
                "avg_pace_sec_per_km": avg_pace_sec,
                "tss": act.get("trainingStressScore") or 0,
                "intensity_factor": act.get("intensityFactor") or 0,
                "avg_speed_mps": act.get("averageSpeed") or 0,
                "elevation_gain_m": act.get("elevationGain") or 0,
                "pool_length_m": act.get("poolLength"),
                "swolf": act.get("averageSwolf"),
                "calories": act.get("calories") or 0,
                "linked_gym_template_id": None,
            })
    except Exception as e:
        sys.stderr.write(f"Warn activities fetch failed: {e}\n")

    result = {
        "status": "success",
        "athlete_stats": athlete_stats,
        "metrics_count": len(synced_metrics),
        "activities_count": len(synced_activities),
        "metrics": synced_metrics,
        "activities": synced_activities,
    }

    print(json.dumps(result))

if __name__ == "__main__":
    main()
