@ivplugin @ivplugin_decision
Feature: Basic tests for Decision

  @javascript
  Scenario: Plugin ivplugin_decision appears in the list of installed additional plugins
    Given I log in as "admin"
    When I navigate to "Plugins > Plugins overview" in site administration
    And I follow "Additional plugins"
    Then I should see "Decision"
    And I should see "ivplugin_decision"
