@ivplugin @ivplugin_skipsegment
Feature: Basic tests for Skipped Segment

  @javascript
  Scenario: Plugin ivplugin_skipsegment appears in the list of installed additional plugins
    Given I log in as "admin"
    When I navigate to "Plugins > Plugins overview" in site administration
    And I follow "Additional plugins"
    Then I should see "Skipped Segment"
    And I should see "ivplugin_skipsegment"
