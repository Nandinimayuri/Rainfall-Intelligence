from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.services.location_service import LocationService
from app.services.weather_service import WeatherService
from app.ml.feature_engineering import extract_features
from app.ml.regime_classifier import regime_classifier
from app.schemas.ml import RegimeClassificationResponse
from app.models.ml_records import RegimePrediction

router = APIRouter()


@router.get("/current", response_model=RegimeClassificationResponse)
async def get_current_regime(
    district: Optional[str] = Query(None, description="District name"),
    state: Optional[str] = Query(None, description="State name"),
    lat: Optional[float] = Query(None, description="Latitude"),
    lon: Optional[float] = Query(None, description="Longitude"),
    db: Session = Depends(get_db)
):
    """
    Evaluates and identifies the prevailing Weather Regime for the selected location
    using real-time live NWP meteorological observations.
    """
    target_lat = lat
    target_lon = lon
    resolved_district = district
    resolved_state = state

    if (target_lat is None or target_lon is None) and district:
        loc = LocationService.get_district_by_name(db, district, state)
        if not loc:
            raise HTTPException(status_code=404, detail=f"District '{district}' not found.")
        target_lat = loc.latitude
        target_lon = loc.longitude
        resolved_district = loc.district
        resolved_state = loc.state

    if target_lat is None or target_lon is None:
        target_lat = 28.6139
        target_lon = 77.2090
        resolved_district = "New Delhi"
        resolved_state = "Delhi"

    # Fetch live weather
    try:
        forecast = await WeatherService.fetch_live_forecast(
            latitude=target_lat,
            longitude=target_lon,
            state=resolved_state,
            district=resolved_district,
            forecast_days=1,
            db=db
        )
        curr = forecast.current
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail="Live data currently unavailable. Cannot determine regime without live meteorological feed."
        )

    # Extract features
    features = extract_features(
        rainfall_nwp=curr.rainfall or 0.0,
        temperature=curr.temperature or 25.0,
        humidity=curr.humidity or 65.0,
        surface_pressure=curr.pressure or 1005.0,
        wind_speed=curr.wind_speed or 12.0,
        wind_direction=curr.wind_direction or 220.0,
        latitude=target_lat,
        longitude=target_lon,
        elevation=curr.elevation or 150.0,
        timestamp_dt=datetime.now()
    )

    regime, conf, probs, explanation = regime_classifier.classify(features)

    # Log prediction into database
    loc = LocationService.get_district_by_name(db, resolved_district or "New Delhi", resolved_state)
    if loc:
        try:
            pred_record = RegimePrediction(
                location_id=loc.id,
                timestamp=datetime.now(timezone.utc),
                predicted_regime=regime,
                confidence=conf,
                explanation=explanation,
                method=regime_classifier.model_version
            )
            db.add(pred_record)
            db.commit()
        except Exception:
            db.rollback()

    return RegimeClassificationResponse(
        predicted_regime=regime,
        confidence=conf,
        confidence_percent=round(conf * 100, 1),
        probabilities=probs,
        explanation=explanation,
        method=regime_classifier.model_version,
        district=resolved_district,
        state=resolved_state,
        timestamp=curr.timestamp,
        features=features
    )
