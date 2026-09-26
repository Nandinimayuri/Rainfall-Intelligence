import logging
import re
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.ai.provider import (
    get_llm_provider,
    LLMConfigurationError,
    LLMTimeoutError,
    LLMProviderError
)
from app.ai.prompts import build_chat_messages
from app.ai.context import ApplicationContextBuilder
from app.ai.response_validator import ResponseValidator
from app.models.location import Location

logger = logging.getLogger(__name__)


def _extract_district_from_message(db: Session, text: str) -> Optional[Location]:
    """
    Checks if the user query explicitly mentions an Indian district in the database.
    Allows queries like 'What is the rainfall in Krishna?' or 'Vijayawada forecast'.
    """
    clean_text = text.lower()
    # Query all district names from DB
    districts = db.query(Location).all()
    # Sort by length descending to match longer names first
    for loc in sorted(districts, key=lambda d: len(d.district), reverse=True):
        pattern = r'\b' + re.escape(loc.district.lower()) + r'\b'
        if re.search(pattern, clean_text):
            return loc
    return None


def _generate_grounded_answer(user_message: str, context_data: Dict[str, Any]) -> str:
    """
    Produces an accurate, grounded meteorological response directly from genuine
    application context without exposing technical or environment errors.
    """
    q = user_message.lower()
    loc = context_data.get("selected_location")
    if not isinstance(loc, dict):
        loc = {}
    weather = context_data.get("live_weather")
    if not isinstance(weather, dict):
        weather = {}
    regime = context_data.get("regime_analysis")
    if not isinstance(regime, dict):
        regime = {}
    bias = context_data.get("bias_correction")
    if not isinstance(bias, dict):
        bias = {}

    district_name = loc.get("district", "the selected district")
    state_name = loc.get("state", "India")
    rain_val = weather.get("precipitation_mm", 0.0) or 0.0
    temp_val = weather.get("temperature_c", "—")
    humidity_val = weather.get("relative_humidity_percent", "—")
    wind_val = weather.get("wind_speed_kmh", "—")
    
    active_regime = regime.get("predicted_regime", "Active Monsoon")
    conf_pct = regime.get("confidence_percent", 0.0)
    regime_desc = regime.get("explanation", "")

    raw_rain = bias.get("raw_nwp_rainfall_mm", 0.0) or 0.0
    corr_rain = bias.get("corrected_rainfall_mm", 0.0) or 0.0
    delta = corr_rain - raw_rain
    risk_level = bias.get("heavy_rain_risk_level", "LOW")
    risk_prob = bias.get("heavy_rain_probability_percent", 0.0)

    # 1. Rainfall / Current Weather
    if any(k in q for k in ["rainfall", "rain", "precip", "temp", "weather", "humidity", "wind"]):
        return (
            f"**Current Observations for {district_name}, {state_name}:**\n\n"
            f"- **Precipitation:** {rain_val:.2f} mm\n"
            f"- **Temperature:** {temp_val} °C\n"
            f"- **Relative Humidity:** {humidity_val}%\n"
            f"- **Wind Speed:** {wind_val} km/h\n"
            f"- **Prevailing Regime:** {active_regime}"
        )

    # 2. Weather Regime
    if any(k in q for k in ["regime", "pattern", "synoptic"]):
        return (
            f"**Weather Regime Analysis for {district_name}, {state_name}:**\n\n"
            f"- **Active Regime:** {active_regime} ({conf_pct:.1f}% confidence)\n"
            f"- **Meteorological Characteristics:** {regime_desc}\n"
            f"- **Significance:** In this regime, raw NWP forecasts tend to display systematic errors that the AI post-processing model corrects."
        )

    # 3. AI Correction / What changed
    if any(k in q for k in ["correct", "bias", "change", "delta", "nwp"]):
        change_str = f"+{delta:.2f} mm" if delta > 0 else f"{delta:.2f} mm"
        fcst_time = bias.get("forecast_time")
        time_line = f"- **Forecast Time:** {fcst_time}\n" if fcst_time else ""
        return (
            f"**AI Bias Correction for {district_name}, {state_name}:**\n\n"
            f"{time_line}"
            f"- **Raw NWP Baseline Forecast:** {raw_rain:.2f} mm\n"
            f"- **AI Corrected Forecast:** {corr_rain:.2f} mm\n"
            f"- **Adjustment (Delta):** {change_str}\n"
            f"- **Regime Model:** Calibrated for {active_regime} conditions to minimize forecast error over India."
        )

    # 4. Heavy Rainfall Risk / Alert
    if any(k in q for k in ["heavy", "risk", "probability", "alert", "extreme", "flood"]):
        return (
            f"**Heavy Rainfall Risk for {district_name}, {state_name}:**\n\n"
            f"- **Risk Tier:** **{risk_level}**\n"
            f"- **Exceedance Probability:** {risk_prob:.1f}% chance of exceeding the 25 mm threshold\n"
            f"- **Corrected Rainfall Outlook:** {corr_rain:.2f} mm under {active_regime} dynamics."
        )

    # 5. Forecast / Outlook
    if any(k in q for k in ["forecast", "outlook", "tomorrow", "expected"]):
        fcst_time = bias.get("forecast_time")
        time_line = f"- **Forecast Time:** {fcst_time}\n" if fcst_time else ""
        return (
            f"**Forecast Summary for {district_name}, {state_name}:**\n\n"
            f"{time_line}"
            f"- **Corrected Rainfall:** {corr_rain:.2f} mm (Raw NWP: {raw_rain:.2f} mm)\n"
            f"- **Active Weather Regime:** {active_regime}\n"
            f"- **Heavy Rain Risk:** {risk_level} ({risk_prob:.1f}% exceedance probability)"
        )

    # Default overview
    fcst_time = bias.get("forecast_time")
    time_line = f"- **Forecast Period:** {fcst_time}\n" if fcst_time else ""
    return (
        f"**Meteorological Intelligence for {district_name}, {state_name}:**\n\n"
        f"- **Current Rainfall:** {rain_val:.2f} mm\n"
        f"{time_line}"
        f"- **Weather Regime:** {active_regime}\n"
        f"- **Raw vs Corrected Forecast:** {raw_rain:.2f} mm → **{corr_rain:.2f} mm** ({delta:+.2f} mm)\n"
        f"- **Heavy Rainfall Risk:** {risk_level} ({risk_prob:.1f}% probability)"
    )


class AIAssistantService:
    """
    High-level orchestrator for the SIH26080 AI Assistant.
    Retrieves live application context, constructs grounded prompt,
    invokes LLM provider, and validates response.
    """

    @classmethod
    async def chat(
        cls,
        user_message: str,
        db: Session,
        district: Optional[str] = None,
        state: Optional[str] = None,
        lat: Optional[float] = None,
        lon: Optional[float] = None,
        history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        timestamp_str = datetime.now(timezone.utc).isoformat()
        query_lower = user_message.lower().strip()

        # Handle project identity inquiry without developer attribution
        direct_dev_queries = [
            "who developed this project", "who developed this project?", "who developed this?",
            "who developed it", "who made this", "who made this?", "who created this",
            "who created this?", "who is the developer", "who is the developer?",
            "developer name", "who prepared this project", "who prepared this project?",
            "who built this", "who built this project"
        ]
        if any(query_lower == q or query_lower.startswith(q) for q in direct_dev_queries):
            return {
                "reply": "This project is the Regime-Aware AI/ML Rainfall Post-Processing System developed for Smart India Hackathon (SIH26080).",
                "district": district or "New Delhi",
                "state": state or "Delhi",
                "regime": "Verified",
                "status": "success",
                "timestamp": timestamp_str
            }

        # Check if the user explicitly mentioned a district in their message
        matched_loc = _extract_district_from_message(db, user_message)
        if matched_loc:
            district = matched_loc.district
            state = matched_loc.state
            lat = matched_loc.latitude
            lon = matched_loc.longitude

        # 1. Build Grounded Context
        context_data = await ApplicationContextBuilder.build_context(
            db=db,
            district=district,
            state=state,
            lat=lat,
            lon=lon
        )
        context_text = ApplicationContextBuilder.format_context_for_prompt(context_data)

        # Extract context tags for response metadata
        loc_info = context_data.get("selected_location") or {}
        regime_info = context_data.get("regime_analysis") or {}

        active_district = district or loc_info.get("district", "New Delhi")
        active_state = state or loc_info.get("state", "Delhi")
        active_regime = regime_info.get("predicted_regime", "Active Monsoon")

        # 2. Invoke LLM Provider if configured
        provider = get_llm_provider()
        if provider.is_configured:
            messages = build_chat_messages(
                user_message=user_message,
                context_text=context_text,
                history=history or []
            )
            try:
                raw_reply = await provider.generate_response(messages)
                sanitized_reply = ResponseValidator.validate_and_sanitize(raw_reply, user_message)
                return {
                    "reply": sanitized_reply,
                    "district": active_district,
                    "state": active_state,
                    "regime": active_regime,
                    "status": "success",
                    "timestamp": timestamp_str
                }
            except (LLMConfigurationError, LLMTimeoutError, LLMProviderError) as exc:
                logger.warning(f"External LLM invocation error: {exc}. Providing grounded meteorological fallback.")
            except Exception as exc:
                logger.error(f"Unexpected assistant LLM error: {exc}")

        # Grounded answer directly from genuine application data
        grounded_reply = _generate_grounded_answer(user_message, context_data)
        return {
            "reply": grounded_reply,
            "district": active_district,
            "state": active_state,
            "regime": active_regime,
            "status": "success",
            "timestamp": timestamp_str
        }
