@ivplugin @ivplugin_htmlviewer
Feature: Basic tests for HTML Viewer

  @javascript
  Scenario: Plugin ivplugin_htmlviewer appears in the list of installed additional plugins
    Given I log in as "admin"
    When I navigate to "Plugins > Plugins overview" in site administration
    And I follow "Additional plugins"
    Then I should see "HTML Viewer"
    And I should see "ivplugin_htmlviewer"
