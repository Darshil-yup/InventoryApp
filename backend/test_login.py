import requests
print("Pinging Render...")

# Test Darshil and 3312
try:
    res = requests.post("https://inventoryapp-hyoz.onrender.com/api/auth/login", json={"name": "Darshil", "pin": "3312"}, timeout=30)
    print("Status:", res.status_code)
    print("Response:", res.text)
except Exception as e:
    print("Error:", e)
