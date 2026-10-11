"""Switch that shows or hides Dockbar on every screen at once."""

from __future__ import annotations

from typing import Any

from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import STATE_OFF
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.helpers.restore_state import RestoreEntity

from .const import DOMAIN


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Add the Dockbar switch."""
    async_add_entities([DockbarSwitch(entry)])


class DockbarSwitch(SwitchEntity, RestoreEntity):
    """On means the bar is shown. The frontend watches this entity's state."""

    _attr_has_entity_name = True
    _attr_name = None
    _attr_icon = "mdi:dock-left"

    def __init__(self, entry: ConfigEntry) -> None:
        """Initialise; on by default, then restored from the last run."""
        self._attr_unique_id = f"{entry.entry_id}_enabled"
        self._attr_is_on = True
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
            name="Dockbar",
            manufacturer="Dockbar",
            entry_type=DeviceEntryType.SERVICE,
        )

    async def async_added_to_hass(self) -> None:
        """Restore the previous on/off state."""
        await super().async_added_to_hass()
        if (last := await self.async_get_last_state()) is not None:
            self._attr_is_on = last.state != STATE_OFF

    async def async_turn_on(self, **kwargs: Any) -> None:
        """Show the bar everywhere."""
        self._attr_is_on = True
        self.async_write_ha_state()

    async def async_turn_off(self, **kwargs: Any) -> None:
        """Hide the bar everywhere."""
        self._attr_is_on = False
        self.async_write_ha_state()
