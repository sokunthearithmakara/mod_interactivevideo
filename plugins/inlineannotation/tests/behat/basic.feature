@ivplugin @ivplugin_inlineannotation
Feature: Basic tests for Inline Annotations

  @javascript
  Scenario: Plugin ivplugin_inlineannotation appears in the list of installed additional plugins
    Given I log in as "admin"
    When I navigate to "Plugins > Plugins overview" in site administration
    And I follow "Additional plugins"
    Then I should see "Inline Annotations"
    And I should see "ivplugin_inlineannotation"
