@ivplugin @ivplugin_discussion
Feature: Basic tests for Discussion

  @javascript
  Scenario: Plugin ivplugin_discussion appears in the list of installed additional plugins
    Given I log in as "admin"
    When I navigate to "Plugins > Plugins overview" in site administration
    And I follow "Additional plugins"
    Then I should see "Discussion"
    And I should see "ivplugin_discussion"
