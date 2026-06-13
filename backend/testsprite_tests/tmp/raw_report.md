
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** backend
- **Date:** 2026-06-13
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001 get api v1 health returns status ok
- **Test Code:** [TC001_get_api_v1_health_returns_status_ok.py](./TC001_get_api_v1_health_returns_status_ok.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/fbc5035c-b7bb-4b1f-a447-4c9e7271e10f/0db7ae08-d917-4331-9f9c-f9e3604aed67
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002 post api v1 session upload with valid csv and jwt
- **Test Code:** [TC002_post_api_v1_session_upload_with_valid_csv_and_jwt.py](./TC002_post_api_v1_session_upload_with_valid_csv_and_jwt.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 32, in <module>
  File "<string>", line 21, in test_post_api_v1_session_upload_with_valid_csv_and_jwt
AssertionError: Expected 200 OK but got 405 with body: {"detail":"Method Not Allowed"}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/fbc5035c-b7bb-4b1f-a447-4c9e7271e10f/db1b5ec2-7e28-482f-a664-6817fe6e932f
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003 post api v1 session upload without jwt returns unauthorized
- **Test Code:** [TC003_post_api_v1_session_upload_without_jwt_returns_unauthorized.py](./TC003_post_api_v1_session_upload_without_jwt_returns_unauthorized.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 18, in <module>
  File "<string>", line 14, in test_post_api_v1_session_upload_without_jwt_returns_unauthorized
AssertionError: Expected status code 401 but got 405

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/fbc5035c-b7bb-4b1f-a447-4c9e7271e10f/6542091a-89b1-4700-8356-845910b1fd50
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004 post api v1 session upload with invalid or empty csv returns validation error
- **Test Code:** [TC004_post_api_v1_session_upload_with_invalid_or_empty_csv_returns_validation_error.py](./TC004_post_api_v1_session_upload_with_invalid_or_empty_csv_returns_validation_error.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 35, in <module>
  File "<string>", line 25, in test_post_api_v1_session_upload_with_invalid_or_empty_csv_returns_validation_error
AssertionError: Expected 400, got 405

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/fbc5035c-b7bb-4b1f-a447-4c9e7271e10f/59705df2-7c7f-4b69-8223-dc1779425b11
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005 get api v1 session sessionid status with valid jwt returns progress
- **Test Code:** [TC005_get_api_v1_session_sessionid_status_with_valid_jwt_returns_progress.py](./TC005_get_api_v1_session_sessionid_status_with_valid_jwt_returns_progress.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 80, in <module>
  File "<string>", line 32, in test_get_session_status_with_valid_jwt_returns_progress
AssertionError: Upload failed with status 405

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/fbc5035c-b7bb-4b1f-a447-4c9e7271e10f/fed07223-d523-4c97-9bac-91c308318553
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006 get api v1 session sessionid status without jwt returns unauthorized
- **Test Code:** [TC006_get_api_v1_session_sessionid_status_without_jwt_returns_unauthorized.py](./TC006_get_api_v1_session_sessionid_status_without_jwt_returns_unauthorized.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 35, in <module>
  File "<string>", line 21, in test_get_session_status_without_jwt_returns_unauthorized
AssertionError: Setup failed: expected 200, got 405

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/fbc5035c-b7bb-4b1f-a447-4c9e7271e10f/6536add9-3db8-4c85-98a5-05897c440d18
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC007 get api v1 session sessionid status for unknown sessionid returns not found
- **Test Code:** [TC007_get_api_v1_session_sessionid_status_for_unknown_sessionid_returns_not_found.py](./TC007_get_api_v1_session_sessionid_status_for_unknown_sessionid_returns_not_found.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/fbc5035c-b7bb-4b1f-a447-4c9e7271e10f/1d8640ef-bbef-41eb-926b-c0258ae33bcd
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC008 get api v1 session sessionid analysis after completion returns insights
- **Test Code:** [TC008_get_api_v1_session_sessionid_analysis_after_completion_returns_insights.py](./TC008_get_api_v1_session_sessionid_analysis_after_completion_returns_insights.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 61, in <module>
  File "<string>", line 25, in test_get_session_analysis_after_completion_returns_insights
AssertionError: Upload failed: {"detail":"Method Not Allowed"}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/fbc5035c-b7bb-4b1f-a447-4c9e7271e10f/1c1ec889-a52e-407b-8f07-79380b21acaa
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC009 get api v1 session sessionid analysis before completion returns not ready error
- **Test Code:** [TC009_get_api_v1_session_sessionid_analysis_before_completion_returns_not_ready_error.py](./TC009_get_api_v1_session_sessionid_analysis_before_completion_returns_not_ready_error.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 69, in <module>
  File "<string>", line 31, in test_get_api_v1_session_sessionid_analysis_before_completion_returns_not_ready_error
AssertionError: Upload failed: 405 {"detail":"Method Not Allowed"}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/fbc5035c-b7bb-4b1f-a447-4c9e7271e10f/72a9c1f6-61b6-461c-a49d-60d75131677c
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC010 get api v1 history with valid jwt returns paginated history
- **Test Code:** [TC010_get_api_v1_history_with_valid_jwt_returns_paginated_history.py](./TC010_get_api_v1_history_with_valid_jwt_returns_paginated_history.py)
- **Test Error:** Traceback (most recent call last):
  File "<string>", line 15, in test_get_api_v1_history_with_valid_jwt_returns_paginated_history
  File "/var/lang/lib/python3.12/site-packages/requests/models.py", line 1024, in raise_for_status
    raise HTTPError(http_error_msg, response=self)
requests.exceptions.HTTPError: 401 Client Error: Unauthorized for url: http://localhost:8000/api/v1/history

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 40, in <module>
  File "<string>", line 17, in test_get_api_v1_history_with_valid_jwt_returns_paginated_history
AssertionError: Request to http://localhost:8000/api/v1/history failed: 401 Client Error: Unauthorized for url: http://localhost:8000/api/v1/history

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/fbc5035c-b7bb-4b1f-a447-4c9e7271e10f/afecd7e6-9b5d-499e-b5da-a988620521ed
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **20.00** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---