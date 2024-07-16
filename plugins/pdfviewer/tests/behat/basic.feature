@ivplugin @ivplugin_pdfviewer
Feature: Basic tests for PDF Viewer

  @javascript
  Scenario: Plugin ivplugin_pdfviewer appears in the list of installed additional plugins
    Given I log in as "admin"
    When I navigate to "Plugins > Plugins overview" in site administration
    And I follow "Additional plugins"
    Then I should see "PDF Viewer"
    And I should see "ivplugin_pdfviewer"
