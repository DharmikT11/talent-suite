"""Google Sheet & Google Drive Connector via Apps Script."""

import json
import requests
from typing import Dict, Any, List


class SheetError(Exception):
    pass


class SheetConnector:
    def __init__(self, url: str, access_key: str = ""):
        self.url = (url or "").strip()
        self.access_key = (access_key or "").strip()

    def is_configured(self) -> bool:
        return bool(self.url and self.url.startswith("https://script.google.com/"))

    def validate_url(self) -> None:
        if not self.url.startswith("https://script.google.com/"):
            raise SheetError("The link should start with https://script.google.com/ — copy the Web app URL ending with /exec.")
        if self.url.rstrip("/").endswith("/dev"):
            raise SheetError("This is a test (/dev) link. Use the deployed Web app URL that ends with /exec.")

    def _parse(self, response: requests.Response) -> dict:
        if response.status_code in (401, 403):
            raise SheetError("Google refused access. In Apps Script, set deployment 'Who has access' to 'Anyone', then redeploy.")
        if response.status_code == 404:
            raise SheetError("Link not found. The deployment may have been deleted.")
        try:
            data = response.json()
        except ValueError:
            if "accounts.google.com" in response.url or "<html" in response.text[:200].lower():
                raise SheetError("Google returned a sign-in page. Set 'Who has access' to 'Anyone' in deployment.")
            raise SheetError(f"Unexpected response from Google Sheet (HTTP {response.status_code}).")
        if not data.get("ok"):
            raise SheetError(data.get("error", "The sheet reported an unknown error."))
        return data

    def _get(self, params: dict) -> dict:
        try:
            response = requests.get(self.url, params={**params, "key": self.access_key}, timeout=45)
        except requests.RequestException as exc:
            raise SheetError(f"Could not reach Google: {exc.__class__.__name__}. Check internet connection.")
        return self._parse(response)

    def _post(self, payload: dict) -> dict:
        try:
            response = requests.post(
                self.url,
                data=json.dumps({**payload, "key": self.access_key}),
                headers={"Content-Type": "text/plain;charset=utf-8"},
                timeout=90,
            )
        except requests.RequestException as exc:
            raise SheetError(f"Could not reach Google: {exc.__class__.__name__}. Check internet connection.")
        return self._parse(response)

    def read(self, sheet: str = "") -> dict:
        self.validate_url()
        params = {"action": "read"}
        if sheet:
            params["sheet"] = sheet
        return self._get(params)

    def set_headers(self, headers: List[str], sheet: str = "") -> None:
        self.validate_url()
        payload = {"action": "setHeaders", "headers": headers}
        if sheet:
            payload["sheet"] = sheet
        self._post(payload)

    def append(self, rows: List[Dict[str, Any]], sheet: str = "") -> int:
        self.validate_url()
        payload = {"action": "append", "rows": rows}
        if sheet:
            payload["sheet"] = sheet
        return int(self._post(payload).get("appended", 0))

    def update_or_append(self, rows: List[Dict[str, Any]], sheet: str = "") -> dict:
        self.validate_url()
        payload = {"action": "updateOrAppend", "rows": rows}
        if sheet:
            payload["sheet"] = sheet
        try:
            res = self._post(payload)
            return res
        except SheetError as exc:
            # If the deployed Apps Script doesn't have updateOrAppend yet, fallback to append
            if "Unknown action" in str(exc) or "unknown action" in str(exc).lower():
                appended = self.append(rows, sheet=sheet)
                return {"ok": True, "updated": 0, "appended": appended, "fallback": True}
            raise

