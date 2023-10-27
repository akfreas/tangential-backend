#!/usr/bin/env python3

import requests
import json
from pprint import pprint
from os import path
from datetime import datetime, timedelta
import json
import re
from pytz import timezone


if path.exists('token.json'):
  with open('token.json', 'r') as f:
      token = json.load(f)
      bearer_token = token['access_token']
      refresh_token = token['refresh_token']
atlassian_id = 'd3ad714f-4260-4f1c-9bc4-00c62e1a52e9'

with open('credentials.json', 'r') as f:
    credentials = json.load(f)
    client_secret = credentials['client_secret']
    client_id = credentials['client_id']

proxies = {
    'http': 'http://localhost:8080',
    'https': 'http://localhost:8080'
}

def make_proxied_post(url, data, headers):
    response = requests.post(url, data, headers=headers, proxies=proxies, verify=False)
    if response.status_code == 200:
        return json.loads(response.text)
    else:
        print('Failed to post:', response.status_code, response.text)
        return None
        
def make_proxied_get(url, headers, params):
    response = requests.get(url, headers=headers, params=params, proxies=proxies, verify=False)
    if response.status_code == 200:
        return json.loads(response.text)
    else:
        print('Failed to get:', response.status_code, response.text)
        return None

def refresh_bearer_token(refresh_token):
    token_url = 'https://auth.atlassian.com/oauth/token'
    
    # Define the payload for the refresh token request
    payload = {
        'grant_type': 'refresh_token',
        'client_id': client_id,  # Replace with your client ID
        'client_secret': client_secret,  
        'refresh_token': refresh_token
    }
    
    # Make the request to refresh the token
    # response = requests.post(token_url, data=payload)
    response = make_proxied_post(token_url, payload, {})
    with open('token.json', 'w') as f:
        json.dump(response, f)
    return response['access_token']



def fetch_issue_query_changelogs(jql_query, max_results=50):
    '''
    Fetch the changelog for each issue returned by the given JQL query.

    :param jql_query: The JQL query string
    :param max_results: Maximum number of issues to return (default is 50)
    :return: A list of dictionaries containing 'issue_id' and 'changelog'
    '''
    params = {
        'jql': jql_query,
        'fields': '',  # Empty to only get issue key and changelog
        'expand': 'changelog',  # To include changelog in the response
        'maxResults': max_results
    }

    # Make the authenticated request to search for issues
    response = make_authenticated_get('search', params)

    if response is None:
        print('Failed to get issues for JQL query:', jql_query)
        return []

    issues = response.get('issues', [])
    changelogs = []

    for issue in issues:
        issue_id = issue['id']
        changelog = issue['changelog']['histories']
        changelogs.append({
            'issue_id': issue_id,
            'key': issue['key'],
            'changelog': changelog
        })

    return changelogs

def fetch_issue_changelog(issue_id, max_results=50):
    '''
    Fetch the changelog for the given issue ID, paginating if necessary.

    :param issue_id: The issue ID
    :param max_results: Maximum number of changelog items to fetch (default is 50)
    :return: A list of changelog items
    '''
    changelog_items = []
    start_at = 0
    fetched = 0

    while True:
        params = {
            'startAt': start_at,
            'maxResults': max_results
        }

        response = make_authenticated_get(f'issue/{issue_id}/changelog', params=params)
        if response is None:
            print(f'Failed to get changelog for issue ID: {issue_id}')
            return []

        changelog = response.get('values', [])
        
        # Filter out unwanted fields from the author dictionary
        for item in changelog:
            item['author'] = {
                'accountId': item['author'].get('accountId', ''),
                'displayName': item['author'].get('displayName', '')
            }

        changelog_items.extend(changelog)

        fetched += len(changelog)
        
        # Check if we've fetched all items or reached the last page
        if len(changelog) < max_results or fetched >= max_results:
            break

        # Update the starting index for the next page of results
        start_at += max_results

    return changelog_items



def fetch_child_issues(parent_issue_key, max_results=5000):
    
    return get_by_jql(f'parent = {parent_issue_key}')

def get_workspace_statuses():
    path = 'status'


    # Make the HTTP request
    response = make_authenticated_get(path)
    return response


bearer_token = refresh_bearer_token(refresh_token)

def make_authenticated_get(path, params = {}):
    headers = {
      'Accept': 'application/json, text/plain, */*',
      'Authorization': f'Bearer {bearer_token}',
      'User-Agent': 'axios/1.5.1',
      'Host': 'api.atlassian.com'
    }
    url = f'https://api.atlassian.com/ex/jira/{atlassian_id}/rest/api/3/{path}'
    return make_proxied_get(url, headers=headers, params=params)
    
def make_authenticated_post(path, data):
    headers = {
      'Accept': 'application/json, text/plain, */*',
      'Authorization': f'Bearer {bearer_token}',
      'User-Agent': 'axios/1.5.1',
      'Host': 'api.atlassian.com'
    }
    url = f'https://api.atlassian.com/ex/jira/{atlassian_id}/rest/api/3/{path}'

    return make_proxied_post(url, data, headers)
    
def get_fields(filtering):
    path = 'field'
    params = {
        'expand': 'names'
    }

    # Make the HTTP request
    fields = make_authenticated_get(path, params)
    if filtering:  
      return [f for f in fields if re.search(filtering, f.get('name', ''), re.IGNORECASE)]
    else:
      return fields

def get_by_jql(jql = 'project=10001', max_items=5000):
    path = 'search'
    start_at = 0
    max_results = 100  # Jira usually has a limit per request, often 100
    fetched_items = 0
    all_issues = []

    while fetched_items < max_items:
        params = {
            'expand': 'names',
            'jql': jql,
            'startAt': start_at,
            'maxResults': max_results
        }

        # Make the HTTP request
        response = make_authenticated_get(path, params)
        issues = response.get('issues', [])
        all_issues.extend(issues)
        
        fetched = len(issues)
        if fetched == 0:
            break  # No more issues to fetch

        fetched_items += fetched
        start_at += fetched

    return {'issues': all_issues[:max_items]}
  
def sum_story_points(jql, points_fields):
    issues = get_by_jql(jql)['issues']
    total_points = 0
    
    for issue in issues:
        for field in points_fields:
            field_id = field['id']
            points = issue['fields'].get(field_id, 0)
            total_points += points if points else 0  # add the points if they exist

    return total_points

def calculate_velocity(days, points_fields):
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    # Formulate JQL for issues completed in the last X days
    jql = f'status changed to "Done" DURING ("{start_date.strftime("%Y/%m/%d")}", "{end_date.strftime("%Y/%m/%d")}")'
    
    return sum_story_points(jql, points_fields)

gmt = timezone('GMT')

def analyze_epic(epic_key, last_checked_date):
    # Initialize the result dictionary
    result = {}
    
    # Step 1: Compute the 30-day velocity for issues with that epic as a parent
    jql = f'parent = {epic_key}'
    points_fields = get_fields(r'point')  # Assuming this returns the fields used for story points
    velocity = calculate_velocity(30, points_fields)  # Assuming 30 days
    result['velocity'] = velocity
    
    # Step 2: Fetch the changelog for that epic
    changelogs = fetch_issue_changelog(epic_key)
    result['epic_changelog'] = changelogs[0] if changelogs else None
    
    # Step 3: Fetch child issues
    child_issues = fetch_child_issues(epic_key)
    result['child_issues'] = []
    
    # Step 4: Pull changelog and comments and filter out everything before last checked date
    long_running_issues = []
    
    for child in child_issues['issues']:
        child_data = {
            'issue_id': child['id'],
            'key': child['key'],
        }
        
        # Filter changelogs
        changelog = fetch_issue_changelog(child['id'])

        if changelog:
          filtered_changelog = [log for log in changelog if datetime.strptime(log['created'], '%Y-%m-%dT%H:%M:%S.%f%z') > last_checked_date]
          child_data['changelog'] = filtered_changelog
          
          # Filter comments (assuming comments are in a field named 'comment')
          comments = child['fields'].get('comment', {}).get('comments', [])
          filtered_comments = [comment for comment in comments if datetime.strptime(comment['updated'], '%Y-%m-%dT%H:%M:%S.%f%z') > last_checked_date]
          child_data['comments'] = filtered_comments
          current_status = child.get('fields').get('status')
          for log in changelog:
            if current_status.get('statusCategory')['name'] == 'In Progress':
              for item in log['items']:
                  if item['to'] == current_status.get('id'):
                      in_progress_date = datetime.strptime(log['created'], '%Y-%m-%dT%H:%M:%S.%f%z')
                      days_in_status = (gmt.localize(datetime.now()) - in_progress_date).days
                      if days_in_status > 1:
                          import ipdb; ipdb.set_trace()
                          long_running_issues.append({
                              'id': child.get('id'), 
                              'key': child.get('key'), 
                              'self': child.get('self'),
                              'days_in_status': days_in_status
                              })

        result['child_issues'].append(child_data)
    
    # Step 5: Put issue IDs that have been in the “in progress” state for more than 10 days
    result['long_running'] = long_running_issues
    
    return result

# # pprint(fetch_issue_changelog('TAN-93'))
# # # Example usage
# last_checked_date = '2021-09-01'
# last_checked_datetime = datetime.strptime(last_checked_date, '%Y-%m-%d')
# last_checked_datetime = gmt.localize(last_checked_datetime)
# epic_key = 'TAN-93'
# result = analyze_epic(epic_key, last_checked_datetime)

# # # fields = get_fields()
# # # points_fields = [f for f in fields if re.search(r'point', f.get('untranslatedName', ''), re.IGNORECASE)]


# # # result = fetch_issue_query_changelogs('project=10001 AND updated >= -30d')

# # # # days = 30  # Last 30 days

# # # # velocity = calculate_velocity(days, points_fields)
# # # # print(f'Velocity for the last {days} days is: {velocity}')
# pprint(result)
# pprint(get_workspace_statuses())
pprint(analyze_epic('TAN-93', gmt.localize(datetime.now() - timedelta(days=30))))
import ipdb; ipdb.set_trace()
