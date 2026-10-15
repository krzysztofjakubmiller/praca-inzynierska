import os
import smtplib
from email.message import EmailMessage

SENDER = "Matma po kolei <powiadomienia@matmapokolei.pl>"
REPLY_TO = "pomoc@matmapokolei.pl"


def send_email(to: str, subject: str, text: str):
    host = os.environ.get("SMTP_HOST")
    # Lokalnie nie ma usługi wysyłki, więc mail trafia do terminala backendu, a link da się
    # skopiować i kliknąć.
    if not host:
        print(f"Do: {to}\nTemat: {subject}\n\n{text}\n", flush=True)
        return

    message = EmailMessage()
    message["From"] = SENDER
    message["To"] = to
    message["Reply-To"] = REPLY_TO
    message["Subject"] = subject
    message.set_content(text)

    # 587 to port wysyłki z szyfrowaniem STARTTLS, który obsługuje każda usługa pocztowa.
    with smtplib.SMTP(host, 587, timeout=10) as smtp:
        smtp.starttls()
        smtp.login(os.environ["SMTP_USER"], os.environ["SMTP_PASSWORD"])
        smtp.send_message(message)
