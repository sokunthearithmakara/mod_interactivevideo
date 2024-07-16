@ivplugin @ivplugin_iframe
Feature: Basic tests for Iframe

  @javascript
  Scenario: Plugin ivplugin_iframe appears in the list of installed additional plugins
    Given I log in as "admin"
    When I navigate to "Plugins > Plugins overview" in site administration
    And I follow "Additional plugins"
    Then I should see "Iframe"
    And I should see "ivplugin_iframe"
