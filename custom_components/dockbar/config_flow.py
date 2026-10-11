"""Config flow for Dockbar. There is nothing to ask: adding it turns the bar on."""

from __future__ import annotations

from typing import Any

from homeassistant.config_entries import ConfigFlow, ConfigFlowResult

from .const import DOMAIN


class DockbarConfigFlow(ConfigFlow, domain=DOMAIN):
    """Single-step flow; the manifest's single_config_entry stops a second one."""

    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Confirm and create the entry."""
        if user_input is not None:
            return self.async_create_entry(title="Dockbar", data={})
        return self.async_show_form(step_id="user")
