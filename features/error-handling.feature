Feature: Error Handling and Monitoring
  In order to quickly identify and share critical issues
  As a developer monitoring logs
  I want to collect errors in the background and easily copy them

  Background:
    Given I am viewing logs for deployment "my-api"

  Scenario: Background Error Collection
    When the log stream receives the following lines:
      | [INFO] Starting up... |
      | [ERROR] Database connection failed |
      | [FATAL] System crash imminent |
    And I press "e"
    Then I should see "2 errors found" in the status bar
    And I should see "Database connection failed" in the list
    And I should see "System crash imminent" in the list

  Scenario: Switching Modes
    Given I see 3 errors in the error list
    When I press "e"
    Then I should see "[ERROR MODE]"
    When I press "e"
    Then I should NOT see "[ERROR MODE]"
    And I should see the normal log view

  Scenario: Copying Error to Clipboard
    Given I am in error mode with the following error:
      | [ERROR] NullReferenceException at Line 42 |
    When I press "1"
    And I press "y"
    Then the clipboard should contain "NullReferenceException at Line 42"
    And I should see "Copied to clipboard" message

  # Scenario: Copying Error with Context
  #   Given I am in error mode with an error that has context
  #   When I press "1"
  #   And I press "Y"
  #   Then the clipboard should contain the error with context
