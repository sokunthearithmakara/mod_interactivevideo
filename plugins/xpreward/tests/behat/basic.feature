@ivplugin @ivplugin_xpreward
Feature: Basic tests for XP Reward

  @javascript
  Scenario: Plugin ivplugin_xpreward appears in the list of installed additional plugins
    Given I log in as "admin"
    When I navigate to "Plugins > Plugins overview" in site administration
    And I follow "Additional plugins"
    Then I should see "XP Reward"
    And I should see "ivplugin_xpreward"
