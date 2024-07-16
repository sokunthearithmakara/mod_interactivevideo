@ivplugin @ivplugin_form
Feature: Basic tests for Form

  @javascript
  Scenario: Plugin ivplugin_form appears in the list of installed additional plugins
    Given I log in as "admin"
    When I navigate to "Plugins > Plugins overview" in site administration
    And I follow "Additional plugins"
    Then I should see "Form"
    And I should see "ivplugin_form"
