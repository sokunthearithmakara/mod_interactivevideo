@ivplugin @ivplugin_contentbank
Feature: Basic tests for Contentbank

  @javascript
  Scenario: Plugin ivplugin_contentbank appears in the list of installed additional plugins
    Given I log in as "admin"
    When I navigate to "Plugins > Plugins overview" in site administration
    And I follow "Additional plugins"
    Then I should see "Contentbank"
    And I should see "ivplugin_contentbank"
