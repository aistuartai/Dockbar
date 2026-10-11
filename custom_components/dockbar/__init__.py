"""Dockbar: a persistent, styleable navigation bar for every Home Assistant dashboard.

The integration's job is small: serve the bundled frontend module, register it with the
frontend so every page loads it, and provide a switch to turn the bar on and off.
All bar configuration lives in the frontend's own storage and is edited from the bar.
"""

from __future__ import annotations

from pathlib import Path

from homeassistant.components.frontend import add_extra_js_url, remove_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.loader import async_get_integration

from .const import DOMAIN, JS_FILE, URL_BASE

PLATFORMS = [Platform.SWITCH]
FRONTEND_DIR = Path(__file__).parent / "frontend"


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Serve the frontend module and tell the frontend to load it."""
    data = hass.data.setdefault(DOMAIN, {})

    # Static paths can't be unregistered, so this happens once per HA run even if the
    # entry is disabled and re-enabled.
    if not data.get("static_registered"):
        await hass.http.async_register_static_paths(
            [StaticPathConfig(URL_BASE, str(FRONTEND_DIR), cache_headers=False)]
        )
        data["static_registered"] = True

    # The version in the URL makes browsers fetch the new bundle after an update.
    integration = await async_get_integration(hass, DOMAIN)
    url = f"{URL_BASE}/{JS_FILE}?v={integration.version}"
    # Open browsers are told about the change and load the module without a reload.
    add_extra_js_url(hass, url)
    data["url"] = url

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Stop loading the module. Open browsers are notified and hide the bar."""
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unloaded and (url := hass.data[DOMAIN].pop("url", None)):
        remove_extra_js_url(hass, url)
    return unloaded
