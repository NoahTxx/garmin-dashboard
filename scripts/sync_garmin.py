#!/usr/bin/env python3
"""
Robust Garmin Connect Sync
- Unterstützt modernes DI-Token Format, base64 dumps und JSON-Strings.
- Holt Aktivitäten (inkl. Running mit Pace & Kadenz, Radsport mit Garmin Training Load).
- Bereinigt abgeschnittene Recovery-Titel ("Entspannen & Konzentrieren").
- Holt tägliche Metriken (HRV, Schlaf, Training Readiness, Body Battery, Akute Last).
"""

import os
import sys
import json
import base64
import datetime
import traceback
from typing import Optional, Dict, Any, List

try:
    from dotenv import load_dotenv
    load_dotenv(".env.local")
except Exception:
    pass

def init_garmin_client(token_raw: str):
    import garminconnect
    token_str = token_raw.strip().strip('"').strip("'")

    # 1. Base64 Decode falls kein reines JSON
    if not (token_str.startswith("{") or token_str.startswith("[")):
        try:
            decoded = base64.b64decode(token_str).decode("utf-8")
            if decoded.strip().startswith("{") or decoded.strip().startswith("["):
                token_str = decoded.strip()
        except Exception:
            pass

    gc = garminconnect.Garmin()

    # 2. Versuche nativen gc.login(tokenstore=...)
    authenticated = False
    try:
        gc.login(tokenstore=token_str)
        authenticated = gc.client.is_authenticated
    except Exception as e:
        sys.stderr.write(f"Direct gc.login: {e}\n")

    # 3. Fallback: Parse Token-Objekt manuell
    if not authenticated:
        try:
            parsed = json.loads(token_str)
            token_obj = parsed[0] if isinstance(parsed, list) and len(parsed) > 0 else parsed
            di_token = token_obj.get("di_token") or token_obj.get("access_token")
            di_refresh = token_obj.get("di_refresh_token") or token_obj.get("refresh_token")
            di_client_id = token_obj.get("di_client_id") or token_obj.get("client_id") or "GARMIN_CONNECT_MOBILE_ANDROID_DI"

            if di_token:
                gc.client.di_token = di_token
                gc.client.di_refresh_token = di_refresh
                gc.client.di_client_id = di_client_id

                # Versuche Refresh falls Token abgelaufen
                if di_refresh:
                    try:
                        gc.client._refresh_session()
                    except Exception as re:
                        sys.stderr.write(f"Token refresh attempt: {re}\n")

                # Profil & Display Name laden für API Aufrufe
                try:
                    gc._load_profile_and_settings()
                except Exception as pe:
                    sys.stderr.write(f"Profile load info: {pe}\n")

                authenticated = gc.client.is_authenticated
        except Exception as parse_err:
            sys.stderr.write(f"Token parse error: {parse_err}\n")

    if not authenticated:
        raise ValueError("Garmin Client konnte nicht mit dem hinterlegten Token authentifiziert werden.")

    return gc

def clean_activity_name(name: str, sport_type: str) -> str:
    if not name:
        return "Aktivität"
    clean = name.strip()
    # Garmin schneidet manchmal Atem-Aktivitäten ab wie "Entspannen und Konzentrieren (K"
    lower = clean.lower()
    if "entspannen" in lower and "konzentrieren" in lower:
        return "Entspannen & Konzentrieren (Kurz)"
    if "entspannen" in lower and clean.endswith("("):
        return "Entspannung & Atemübung"
    if clean.endswith(" (k") or clean.endswith(" (K"):
        return clean[:-3].strip() + " (Kurz)"
    return clean

def main():
    token_str = os.environ.get("GARMIN_TOKEN")
    if not token_str:
        print(json.dumps({
            "status": "error",
            "message": "GARMIN_TOKEN Umgebungsvariable fehlt in der Konfiguration."
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
    start_date = today - datetime.timedelta(days=30)

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

    # 2. Tägliche Metriken (letzte 30 Tage)
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
            # Nur hinzufügen, wenn mindestens eine echte Metrik vorhanden ist
            if any(metric[k] is not None for k in ["resting_hr", "hrv_last_night", "sleep_score", "body_battery_max", "training_readiness", "acute_load"]):
                synced_metrics.append(metric)
        except Exception as e:
            sys.stderr.write(f"Warn metric {date_str}: {e}\n")
        curr += datetime.timedelta(days=1)

    # 3. Aktivitäten (letzte 50)
    try:
        raw_acts = gc.get_activities(0, 50)
        for act in raw_acts:
            act_type = (act.get("activityType", {}).get("typeKey") or "").lower()
            act_name = (act.get("activityName") or "").lower()
            avg_power = act.get("avgPower")
            duration_sec = int(act.get("duration", 0))
            distance_m = act.get("distance") or 0.0

            is_commute = False
            sport_type = "other"
            avg_pace_sec = None

            # Sportart-Klassifizierung
            if any(k in act_type for k in ["virtual_ride", "indoor_cycling"]) or "zwift" in act_name:
                sport_type = "zwift"
            elif any(k in act_type for k in ["cycling", "road_biking", "gravel_cycling", "mountain_biking", "biking"]):
                if avg_power is not None and avg_power > 0:
                    sport_type = "road_cycling"
                    is_commute = False
                else:
                    sport_type = "commute"
                    is_commute = True
            elif any(k in act_type for k in ["lap_swimming", "open_water_swimming", "swimming"]):
                sport_type = "swimming"
            elif any(k in act_type for k in ["running", "street_running", "treadmill_running", "trail_running", "track_running"]):
                sport_type = "running"
                if distance_m > 0 and duration_sec > 0:
                    avg_pace_sec = int(duration_sec / (distance_m / 1000.0))
            elif any(k in act_type for k in ["strength_training", "fitness_equipment", "functional_strength_training", "gym"]):
                sport_type = "gym"
            elif any(k in act_type for k in ["breathwork", "meditation", "yoga", "mobility", "stretching", "pilates", "relaxation"]) or "entspannen" in act_name or "konzentrieren" in act_name:
                sport_type = "recovery"
            else:
                sport_type = "other"

            # Bereinigter Name
            cleaned_name = clean_activity_name(act.get("activityName") or "Aktivität", sport_type)

            # Garmin Trainingsbelastung (Activity Training Load / Exercise Load)
            # Garmin speichert die Belastung als activityTrainingLoad oder exerciseLoad
            garmin_load = act.get("activityTrainingLoad") or act.get("exerciseLoad") or act.get("trainingStressScore")
            if garmin_load is not None:
                try:
                    garmin_load = round(float(garmin_load))
                except Exception:
                    garmin_load = 0
            else:
                garmin_load = 0

            # Trainingseffekt nur für echte Trainingseinheiten, NIE für Recovery
            aerobic_te = None
            anaerobic_te = None
            if sport_type != "recovery":
                aerobic_te = act.get("aerobicTrainingEffect")
                anaerobic_te = act.get("anaerobicTrainingEffect")

            raw_meta = {
                "activityType": act.get("activityType"),
                "maxSpeed": act.get("maxSpeed"),
                "maxPower": act.get("maxPower"),
                "aerobicTrainingEffect": aerobic_te,
                "anaerobicTrainingEffect": anaerobic_te,
                "vO2MaxValue": act.get("vO2MaxValue"),
                "device": act.get("deviceName"),
                "garminLoad": garmin_load,
            }

            synced_activities.append({
                "activity_id": str(act.get("activityId")),
                "name": cleaned_name,
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
                "tss": garmin_load if sport_type != "recovery" else 0,
                "intensity_factor": act.get("intensityFactor") or 0,
                "avg_speed_mps": act.get("averageSpeed") or 0,
                "elevation_gain_m": act.get("elevationGain") or 0,
                "pool_length_m": act.get("poolLength"),
                "swolf": act.get("averageSwolf"),
                "calories": act.get("calories") or 0,
                "linked_gym_template_id": None,
                "raw_json": raw_meta,
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
