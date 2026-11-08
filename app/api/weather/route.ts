import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat") || "52.5584";
  const lon = searchParams.get("lon") || "13.0914";

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,precipitation_probability,rain,weather_code,wind_speed_10m&forecast_hours=6&timezone=auto`;
    const res = await fetch(url, { next: { revalidate: 900 } });

    if (!res.ok) {
      return NextResponse.json({ error: "Open-Meteo Anfrage fehlgeschlagen" }, { status: 502 });
    }

    const data = await res.json();
    const current = data.current || {};
    const hourly = data.hourly || {};

    const temp = current.temperature_2m ?? 16;
    const windKmH = current.wind_speed_10m ?? 12;
    const rain = current.rain ?? 0;
    const weatherCode = current.weather_code ?? 0;
    const precipProb = hourly.precipitation_probability ? hourly.precipitation_probability[0] : 0;

    // Calculate smart Outdoor Riding Index (Green: Top, Yellow: Windig/Kühl, Red: Regen/Sturm -> Zwift)
    let outdoorIndex: "green" | "yellow" | "red" = "green";
    let outdoorText = "Top Rennrad-Wetter";

    if (rain > 0.5 || precipProb > 60 || windKmH > 40 || temp < 4) {
      outdoorIndex = "red";
      outdoorText = rain > 0.5 || precipProb > 60 ? "Regenrisiko -> Zwift empfohlen" : "Sturm / Kälte -> Zwift";
    } else if (windKmH > 25 || temp < 10 || precipProb > 30) {
      outdoorIndex = "yellow";
      outdoorText = windKmH > 25 ? `Windig (${Math.round(windKmH)} km/h)` : "Kühl / Wechsellage";
    }

    // 6-hour forecast
    const forecast6h = (hourly.time || []).slice(0, 6).map((t: string, idx: number) => ({
      time: t.split("T")[1]?.slice(0, 5) || "",
      temp: hourly.temperature_2m ? hourly.temperature_2m[idx] : temp,
      precipProb: hourly.precipitation_probability ? hourly.precipitation_probability[idx] : 0,
      windKmH: hourly.wind_speed_10m ? hourly.wind_speed_10m[idx] : windKmH,
      weatherCode: hourly.weather_code ? hourly.weather_code[idx] : 0,
    }));

    return NextResponse.json({
      location: { lat: parseFloat(lat), lon: parseFloat(lon), city: "Falkensee" },
      current: {
        temp,
        apparentTemp: current.apparent_temperature ?? temp,
        humidity: current.relative_humidity_2m ?? 60,
        windKmH,
        rain,
        weatherCode,
        precipProb,
        outdoorIndex,
        outdoorText,
      },
      forecast6h,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Wetterdienst nicht erreichbar";
    return NextResponse.json({
      error: msg,
      current: {
        temp: 18,
        apparentTemp: 18,
        humidity: 55,
        windKmH: 12,
        rain: 0,
        weatherCode: 1,
        precipProb: 10,
        outdoorIndex: "green",
        outdoorText: "Top Rennrad-Wetter",
      },
      forecast6h: [],
    });
  }
}
