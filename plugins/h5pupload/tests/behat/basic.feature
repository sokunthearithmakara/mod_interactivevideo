@ivplugin @ivplugin_h5pupload
Feature: Basic tests for H5P Upload

  @javascript
  Scenario: Plugin ivplugin_h5pupload appears in the list of installed additional plugins
    Given I log in as "admin"
    When I navigate to "Plugins > Plugins overview" in site administration
    And I follow "Additional plugins"
    Then I should see "H5P Upload"
    And I should see "ivplugin_h5pupload"
