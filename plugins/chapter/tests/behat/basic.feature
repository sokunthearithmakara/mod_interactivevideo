@ivplugin @ivplugin_chapter
Feature: Basic tests for Chapter

  @javascript
  Scenario: Plugin ivplugin_chapter appears in the list of installed additional plugins
    Given I log in as "admin"
    When I navigate to "Plugins > Plugins overview" in site administration
    And I follow "Additional plugins"
    Then I should see "Chapter"
    And I should see "ivplugin_chapter"
