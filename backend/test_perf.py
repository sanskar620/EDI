import requests; print(requests.get('http://127.0.0.1:8000/api/v1/reports/performance/1', headers={'Authorization': 'Bearer 123'}).text)
