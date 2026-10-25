"""Email sending service supporting Brevo (Sendinblue) API v3 and Custom SMTP."""

import os
import smtplib
import json
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import Dict, Any, Optional

import requests
from dotenv import set_key

logger = logging.getLogger("recruitai.email")

ENV_PATH = Path(__file__).resolve().parent / ".env"

def get_email_config() -> Dict[str, Any]:
    """Retrieves current email configuration from environment."""
    provider = os.getenv("EMAIL_PROVIDER", "brevo").lower().strip()
    
    brevo_key = os.getenv("BREVO_API_KEY", "").strip()
    brevo_sender_email = os.getenv("BREVO_SENDER_EMAIL", "").strip()
    brevo_sender_name = os.getenv("BREVO_SENDER_NAME", "RecruitAI Talent Team").strip()
    
    smtp_host = os.getenv("SMTP_HOST", "").strip()
    smtp_port = int(os.getenv("SMTP_PORT", "587").strip() or 587)
    smtp_user = os.getenv("SMTP_USER", "").strip()
    smtp_pass = os.getenv("SMTP_PASS", "").strip()
    smtp_sender_email = os.getenv("SMTP_SENDER_EMAIL", "").strip()
    smtp_sender_name = os.getenv("SMTP_SENDER_NAME", "RecruitAI Talent Team").strip()
    smtp_use_tls = os.getenv("SMTP_USE_TLS", "true").lower() in ("true", "1", "yes")

    brevo_configured = bool(brevo_key and brevo_sender_email)
    smtp_configured = bool(smtp_host and smtp_sender_email)

    active_configured = brevo_configured if provider == "brevo" else smtp_configured

    return {
        "provider": provider,
        "is_configured": active_configured,
        "brevo": {
            "configured": brevo_configured,
            "masked_key": f"{brevo_key[:4]}...{brevo_key[-4:]}" if len(brevo_key) > 8 else ("Configured" if brevo_key else ""),
            "sender_email": brevo_sender_email,
            "sender_name": brevo_sender_name,
        },
        "smtp": {
            "configured": smtp_configured,
            "host": smtp_host,
            "port": smtp_port,
            "user": smtp_user,
            "masked_pass": "••••••••" if smtp_pass else "",
            "sender_email": smtp_sender_email,
            "sender_name": smtp_sender_name,
            "use_tls": smtp_use_tls,
        }
    }


def save_email_config(config: Dict[str, Any]) -> None:
    """Persists email configuration to environment and .env file."""
    provider = config.get("provider", "brevo").lower().strip()
    os.environ["EMAIL_PROVIDER"] = provider
    try:
        set_key(str(ENV_PATH), "EMAIL_PROVIDER", provider)
    except Exception:
        pass

    if provider == "brevo":
        if "brevo_api_key" in config and config["brevo_api_key"] is not None:
            key = config["brevo_api_key"].strip()
            os.environ["BREVO_API_KEY"] = key
            try:
                set_key(str(ENV_PATH), "BREVO_API_KEY", key)
            except Exception:
                pass

        if "brevo_sender_email" in config and config["brevo_sender_email"] is not None:
            sender_email = config["brevo_sender_email"].strip()
            os.environ["BREVO_SENDER_EMAIL"] = sender_email
            try:
                set_key(str(ENV_PATH), "BREVO_SENDER_EMAIL", sender_email)
            except Exception:
                pass

        if "brevo_sender_name" in config and config["brevo_sender_name"] is not None:
            sender_name = config["brevo_sender_name"].strip() or "RecruitAI Talent Team"
            os.environ["BREVO_SENDER_NAME"] = sender_name
            try:
                set_key(str(ENV_PATH), "BREVO_SENDER_NAME", sender_name)
            except Exception:
                pass

    elif provider == "smtp":
        host = config.get("smtp_host", "").strip()
        port = str(config.get("smtp_port", 587)).strip()
        user = config.get("smtp_user", "").strip()
        password = config.get("smtp_pass", "").strip()
        sender_email = config.get("smtp_sender_email", "").strip()
        sender_name = config.get("smtp_sender_name", "").strip() or "RecruitAI Talent Team"
        use_tls = "true" if config.get("smtp_use_tls", True) else "false"

        for k, v in [
            ("SMTP_HOST", host),
            ("SMTP_PORT", port),
            ("SMTP_USER", user),
            ("SMTP_SENDER_EMAIL", sender_email),
            ("SMTP_SENDER_NAME", sender_name),
            ("SMTP_USE_TLS", use_tls),
        ]:
            if v:
                os.environ[k] = v
                try:
                    set_key(str(ENV_PATH), k, v)
                except Exception:
                    pass

        if password:
            os.environ["SMTP_PASS"] = password
            try:
                set_key(str(ENV_PATH), "SMTP_PASS", password)
            except Exception:
                pass


def build_html_template(candidate_name: str, plain_text: str, apply_url: Optional[str] = None) -> str:
    """Wraps plain text email into a clean, modern HTML corporate email."""
    # Convert newlines to paragraphs / breaks
    paragraphs = plain_text.strip().split("\n\n")
    html_paragraphs = "".join(f"<p style='margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #1E293B;'>{p.replace(chr(10), '<br/>')}</p>" for p in paragraphs if p.strip())

    cta_button = ""
    if apply_url:
        cta_button = f"""
        <div style="margin: 28px 0; text-align: left;">
            <a href="{apply_url}" target="_blank" style="display: inline-block; background-color: #2563EB; color: #FFFFFF; font-weight: 600; font-size: 15px; padding: 12px 24px; border-radius: 8px; text-decoration: none; box-shadow: 0 2px 4px rgba(37,99,235,0.2);">
                Submit CV & Apply Directly &rarr;
            </a>
        </div>
        """

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recruitment Opportunity</title>
    </head>
    <body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; color: #0F172A;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <div style="border-bottom: 2px solid #EFF6FF; padding-bottom: 16px; margin-bottom: 24px;">
                <span style="font-weight: 800; font-size: 18px; color: #1E40AF; letter-spacing: -0.02em;">RecruitAI</span>
                <span style="font-size: 12px; font-weight: 600; background-color: #EFF6FF; color: #2563EB; padding: 3px 8px; border-radius: 12px; margin-left: 8px;">Talent Team</span>
            </div>
            
            {html_paragraphs}
            
            {cta_button}
            
            <div style="border-top: 1px solid #F1F5F9; padding-top: 20px; margin-top: 32px; font-size: 12px; color: #94A3B8; line-height: 1.5;">
                <p style="margin: 0;">Sent on behalf of the Talent Acquisition Team. If you have questions, simply reply directly to this email.</p>
            </div>
        </div>
    </body>
    </html>
    """


def send_via_brevo(
    to_email: str,
    subject: str,
    text_content: str,
    html_content: Optional[str] = None,
    to_name: str = "",
    sender_email: Optional[str] = None,
    sender_name: Optional[str] = None,
    api_key: Optional[str] = None,
) -> Dict[str, Any]:
    """Sends email via Brevo API v3."""
    key = api_key or os.getenv("BREVO_API_KEY", "").strip()
    if not key:
        raise ValueError("Brevo API Key is missing. Please configure it in Email Settings.")

    s_email = sender_email or os.getenv("BREVO_SENDER_EMAIL", "").strip()
    if not s_email:
        raise ValueError("Sender Email is missing. Enter a sender email verified in your Brevo account.")

    s_name = sender_name or os.getenv("BREVO_SENDER_NAME", "RecruitAI Talent Team").strip()

    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": key,
    }

    payload = {
        "sender": {"name": s_name, "email": s_email},
        "to": [{"email": to_email.strip(), "name": to_name.strip() or to_email.strip()}],
        "subject": subject.strip(),
        "textContent": text_content.strip(),
    }
    if html_content:
        payload["htmlContent"] = html_content

    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=25)
    except requests.RequestException as exc:
        raise ConnectionError(f"Could not reach Brevo API server: {str(exc)}")

    if resp.status_code not in (200, 201, 202):
        err_msg = f"Brevo API error (HTTP {resp.status_code})"
        try:
            data = resp.json()
            if "message" in data:
                err_msg = data["message"]
            elif "error" in data:
                err_msg = data["error"]
        except Exception:
            err_msg = resp.text[:300]
        raise RuntimeError(err_msg)

    data = resp.json()
    message_id = data.get("messageId", "sent")
    return {
        "ok": True,
        "provider": "brevo",
        "message_id": message_id,
        "message": f"Email successfully dispatched to {to_email} via Brevo API.",
    }


def send_via_smtp(
    to_email: str,
    subject: str,
    text_content: str,
    html_content: Optional[str] = None,
    to_name: str = "",
    host: Optional[str] = None,
    port: Optional[int] = None,
    user: Optional[str] = None,
    password: Optional[str] = None,
    sender_email: Optional[str] = None,
    sender_name: Optional[str] = None,
    use_tls: bool = True,
) -> Dict[str, Any]:
    """Sends email via standard SMTP."""
    smtp_host = host or os.getenv("SMTP_HOST", "").strip()
    if not smtp_host:
        raise ValueError("SMTP Host is missing. Please configure it in Email Settings.")

    smtp_port = port or int(os.getenv("SMTP_PORT", "587").strip() or 587)
    smtp_user = user or os.getenv("SMTP_USER", "").strip()
    smtp_pass = password or os.getenv("SMTP_PASS", "").strip()
    s_email = sender_email or os.getenv("SMTP_SENDER_EMAIL", "").strip() or smtp_user
    if not s_email:
        raise ValueError("Sender Email is missing. Enter your sender email address.")

    s_name = sender_name or os.getenv("SMTP_SENDER_NAME", "RecruitAI Talent Team").strip()

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{s_name} <{s_email}>"
    msg["To"] = f"{to_name} <{to_email}>" if to_name else to_email

    part1 = MIMEText(text_content, "plain", "utf-8")
    msg.attach(part1)

    if html_content:
        part2 = MIMEText(html_content, "html", "utf-8")
        msg.attach(part2)

    try:
        if smtp_port == 465:
            with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=25) as server:
                if smtp_user and smtp_pass:
                    server.login(smtp_user, smtp_pass)
                server.sendmail(s_email, [to_email], msg.as_string())
        else:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=25) as server:
                if use_tls:
                    server.starttls()
                if smtp_user and smtp_pass:
                    server.login(smtp_user, smtp_pass)
                server.sendmail(s_email, [to_email], msg.as_string())
    except smtplib.SMTPAuthenticationError:
        raise PermissionError("SMTP Authentication failed. For Gmail, make sure to generate and use an App Password.")
    except smtplib.SMTPConnectError:
        raise ConnectionError(f"Could not connect to SMTP server at {smtp_host}:{smtp_port}.")
    except Exception as exc:
        raise RuntimeError(f"SMTP sending failed: {str(exc)}")

    return {
        "ok": True,
        "provider": "smtp",
        "message": f"Email successfully sent to {to_email} via SMTP.",
    }


def send_email(
    to_email: str,
    subject: str,
    text_content: str,
    to_name: str = "",
    provider: Optional[str] = None,
    apply_url: Optional[str] = None,
) -> Dict[str, Any]:
    """Unified email dispatcher routing to Brevo API or Custom SMTP."""
    cfg = get_email_config()
    chosen_provider = (provider or cfg["provider"] or "brevo").lower().strip()

    html_content = build_html_template(
        candidate_name=to_name or "Candidate",
        plain_text=text_content,
        apply_url=apply_url,
    )

    if chosen_provider == "brevo":
        return send_via_brevo(
            to_email=to_email,
            subject=subject,
            text_content=text_content,
            html_content=html_content,
            to_name=to_name,
        )
    elif chosen_provider == "smtp":
        return send_via_smtp(
            to_email=to_email,
            subject=subject,
            text_content=text_content,
            html_content=html_content,
            to_name=to_name,
        )
    else:
        raise ValueError(f"Unknown email provider: {chosen_provider}. Choose 'brevo' or 'smtp'.")
