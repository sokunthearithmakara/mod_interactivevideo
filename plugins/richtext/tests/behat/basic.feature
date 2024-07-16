@ivplugin @ivplugin_richtext
Feature: Basic tests for Rich Text

  @javascript
  Scenario: Plugin ivplugin_richtext appears in the list of installed additional plugins
    Given I log in as "admin"
    When I navigate to "Plugins > Plugins overview" in site administration
    And I follow "Additional plugins"
    Then I should see "Rich Text"
    And I should see "ivplugin_richtext"
