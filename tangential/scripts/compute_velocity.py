#!/usr/bin/env python3

import requests
import json

# Replace this with your actual Refresh token
refresh_token = "eyJraWQiOiI1MWE2YjE2MjRlMTQ5ZDFiYTdhM2VmZjciLCJhbGciOiJSUzI1NiJ9.eyJqdGkiOiJhYzNhZmUzMy0xNWU0LTQyYjctOGQyOC03ZmU1ZGFlZGUxY2MiLCJzdWIiOiI3MTIwMjA6OTQ0ZTIzMTQtYjBiNS00ZWRkLWE4MmEtNDU0MDYwMTEwNzJiIiwibmJmIjoxNjk4NDAzNDY4LCJpc3MiOiJodHRwczovL2F1dGguYXRsYXNzaWFuLmNvbSIsImlhdCI6MTY5ODQwMzQ2OCwiZXhwIjoxNzA2MTc5NDY4LCJhdWQiOiJsS0NYS2xOdzJteUgxeE5tcmFwSGhwcTVLR2ticTkxaiIsImh0dHBzOi8vaWQuYXRsYXNzaWFuLmNvbS9hdGxfdG9rZW5fdHlwZSI6IlJPVEFUSU5HX1JFRlJFU0giLCJ2ZXJpZmllZCI6InRydWUiLCJodHRwczovL2lkLmF0bGFzc2lhbi5jb20vcHJvY2Vzc1JlZ2lvbiI6InVzLWVhc3QtMSIsImh0dHBzOi8vaWQuYXRsYXNzaWFuLmNvbS9yZWZyZXNoX2NoYWluX2lkIjoibEtDWEtsTncybXlIMXhObXJhcEhocHE1S0drYnE5MWotNzEyMDIwOjk0NGUyMzE0LWIwYjUtNGVkZC1hODJhLTQ1NDA2MDExMDcyYi04M2ZkOGQwOC04YTEwLTQ1YmQtOGQ3Zi04YTJmN2U2NzJkMjAiLCJzY29wZSI6InJlYWQ6amlyYS13b3JrIG9mZmxpbmVfYWNjZXNzIHJlYWQ6bWUgcmVhZDpqaXJhLXVzZXIiLCJodHRwczovL2lkLmF0bGFzc2lhbi5jb20vdWp0IjoiNzkyZTRlNjAtZDNhNS00YWEwLWJhNTgtMzg5NTUxY2U2ZTAwIiwiaHR0cHM6Ly9pZC5hdGxhc3NpYW4uY29tL3ZlcmlmaWVkIjp0cnVlLCJodHRwczovL2lkLmF0bGFzc2lhbi5jb20vc2Vzc2lvbl9pZCI6IjA5OTRkNDllLTcyNTUtNDZkYy1hNDE5LTk5Njc2MzJiNTNlZiIsImh0dHBzOi8vaWQuYXRsYXNzaWFuLmNvbS9wYXJlbnRfYWNjZXNzX3Rva2VuX2lkIjoiZGRmODQxYjMtN2Y1ZS00NDcyLTkwMmMtNzM4YzNiZmJjZTVmIn0.vuIBGPBoi6Uib2lBaDZyMIn20AWDAlhyXObkO1Qp-ijExT2P9IbZYO_26gIX29kIyjNyeblkWMWns-EGjxQGUYo-JmX2Mx55ZZWYaMyV_vZWzq4j5-1rAOmZ59Ra2ZUh5DD1BsHm8kf2AbRRJpiQaEPLBpwR3XJ4xDP3OELAXXq3UP-f6Nfn8e8wMGG_HbBVojl3yiiQEcn8pCHtj-hlmJuBKZRbHsH8gNu59NAIRwZI1OEO6AHbxrpo-C36bj24aV-llqIxQysdrefFhOYqF5fyxbhQLCYR7g25h4hN1moESzbwR0P10m1VQbUGJQf1Ux0GvlAz-Ght80UQgJmchA"
atlassian_id = "d3ad714f-4260-4f1c-9bc4-00c62e1a52e9"
client_secret = "ATOA-AdVQkT9_X9SJG_Vx_nHyf3u3YjNWI2ho_Tynam2ar3VwEH7xg-ztbH8SY91oUT_511E0D4B"
client_id = "lKCXKlNw2myH1xNmrapHhpq5KGkbq91j"


proxies = {
    "http": "http://localhost:8080",
    "https": "http://localhost:8080"
}

def make_proxied_post(url, data, headers):
    response = requests.post(url, data, headers=headers, proxies=proxies, verify=False)
    if response.status_code == 200:
        return json.loads(response.text)
    else:
        print("Failed to post:", response.status_code, response.text)
        return None
        
def make_proxied_get(url, headers, params):
    response = requests.get(url, headers=headers, params=params, proxies=proxies, verify=False)
    if response.status_code == 200:
        return json.loads(response.text)
    else:
        print("Failed to get:", response.status_code, response.text)
        return None

def refresh_bearer_token(refresh_token):
    token_url = "https://auth.atlassian.com/oauth/token"
    
    # Define the payload for the refresh token request
    payload = {
        "grant_type": "refresh_token",
        "client_id": client_id,  # Replace with your client ID
        "client_secret": client_secret,  
        "refresh_token": refresh_token
    }
    
    # Make the request to refresh the token
    # response = requests.post(token_url, data=payload)
    response = make_proxied_post(token_url, payload, {})
    return response["access_token"]

# Refresh the Bearer token
bearer_token = refresh_bearer_token(refresh_token)

def make_authenticated_get(path, params):
    headers = {
      "Accept": "application/json, text/plain, */*",
      "Authorization": f"Bearer {bearer_token}",
      "User-Agent": "axios/1.5.1",
      "Host": "api.atlassian.com"
    }
    url = f"https://api.atlassian.com/ex/jira/{atlassian_id}/rest/api/3/{path}"
    return make_proxied_get(url, headers=headers, params=params)
    
def make_authenticated_post(path, data):
    headers = {
      "Accept": "application/json, text/plain, */*",
      "Authorization": f"Bearer {bearer_token}",
      "User-Agent": "axios/1.5.1",
      "Host": "api.atlassian.com"
    }
    url = f"https://api.atlassian.com/ex/jira/{atlassian_id}/rest/api/3/{path}"

    return make_proxied_post(url, data, headers)
    
# def get_fields():

def get_by_jql(jql = "project=10001"):
      path = "search"
      params = {
          'expand': 'names',
          "jql": jql
      }

      # Make the HTTP request
      response = make_authenticated_get(path, params)

      return response
  
response = get_by_jql()
