import garth
import getpass

email = input("Garmin Email: ").strip()
password = getpass.getpass("Garmin Passwort (unsichtbar beim Tippen): ")

print("Logge bei Garmin ein...")
garth.login(email, password)

token_str = garth.client.dumps()

with open("garmin_token.txt", "w", encoding="utf-8") as f:
    f.write(token_str)

print("\n=== ERFOLGREICH! ===")
print("Dein Token wurde zusätzlich in 'garmin_token.txt' gespeichert.")
print("\nHier ist dein GARMIN_TOKEN für die .env.local:\n")
print(token_str)