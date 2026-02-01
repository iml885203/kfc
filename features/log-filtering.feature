Feature: Log Filtering and Search
  In order to quickly find relevant log entries
  As a developer monitoring logs
  I want to filter and search logs interactively

  Background:
    Given I am viewing logs for deployment "my-api"

  Scenario: Entering Filter Mode
    Given the log stream receives the following lines:
      | [INFO] Application started |
    When I press "/"
    Then I should see "[FILTER MODE]"
    And I should see "Filter:" in the input bar

  Scenario: Applying a Simple Filter
    Given the log stream receives the following lines:
      | [INFO] Application started |
      | [ERROR] Database connection failed |
      | [INFO] Retrying connection |
      | [ERROR] Timeout occurred |
    When I press "/"
    And I type "ERROR"
    And I press "Enter"
    Then I should only see lines containing "ERROR"
    And I should see "Database connection failed"
    And I should see "Timeout occurred"
    And I should NOT see "Application started"
    And I should NOT see "Retrying connection"

  Scenario: Clearing Filter
    Given I have applied filter "ERROR"
    When I press "c"
    Then I should see all log lines
    And I should NOT see "[FILTER MODE]"

  Scenario: Case-Insensitive Filtering
    Given the log stream receives the following lines:
      | [INFO] Application started |
      | [error] Database connection failed |
      | [ERROR] Timeout occurred |
      | [Error] Invalid input |
    When I press "/"
    And I type "error"
    And I press "Enter"
    # By default, filter is case-sensitive, so only lowercase "error" matches
    Then I should see "Database connection failed"
    And I should NOT see "Timeout occurred"
    And I should NOT see "Invalid input"
    # Now toggle case-insensitive mode
    When I press "i"
    Then I should see "i" indicator in the status bar
    # After toggling case-insensitive, all error variants should be visible
    And I should see "Database connection failed"
    And I should see "Timeout occurred"
    And I should see "Invalid input"

  Scenario: Inverted Filter (Exclude Matches)
    Given the log stream receives the following lines:
      | [INFO] Application started |
      | [DEBUG] Initializing components |
      | [ERROR] Database connection failed |
      | [INFO] Retrying connection |
    When I press "/"
    And I type "ERROR"
    And I press "Enter"
    Then I should see "Database connection failed"
    When I press "v"
    Then I should see "NOT" indicator in the status bar
    And I should NOT see "Database connection failed"
    And I should see "Application started"
    And I should see "Initializing components"
    And I should see "Retrying connection"

  Scenario: Filter with Context Lines
    Given the log stream receives the following lines:
      | [INFO] Step 1: Initializing |
      | [INFO] Step 2: Connecting |
      | [ERROR] Connection failed |
      | [INFO] Step 3: Cleaning up |
      | [INFO] Step 4: Exiting |
    When I press "/"
    And I type "ERROR"
    And I press "Enter"
    Then I should see "Connection failed"
    When I press "+"
    Then I should see context lines around the error
    And I should see "Step 2: Connecting"
    And I should see "Step 3: Cleaning up"
    When I press "+"
    Then I should see more context lines
    And I should see "Step 1: Initializing"
    And I should see "Step 4: Exiting"

  Scenario: Decreasing Context Lines
    Given I have applied filter "ERROR" with 2 context lines
    When I press "-"
    Then I should see fewer context lines
    When I press "-"
    Then I should see only the matching line

  Scenario: Filter Mode Cancellation
    Given the log stream receives the following lines:
      | [INFO] Application started |
    When I press "/"
    And I type "test pattern"
    And I press "ESC"
    Then I should NOT see "[FILTER MODE]"
    And the filter should not be applied

  Scenario: No Matches Found
    Given the log stream receives the following lines:
      | [INFO] Application started |
      | [INFO] Server running |
    When I press "/"
    And I type "ERROR"
    And I press "Enter"
    Then I should see "No matches found" message

  Scenario: Invalid Regex Pattern
    Given the log stream receives the following lines:
      | [INFO] Application started |
      | [ERROR] Database connection failed |
    When I press "/"
    And I type "[unclosed"
    And I press "Enter"
    Then I should still see all log lines
    And the filter should handle invalid regex gracefully
