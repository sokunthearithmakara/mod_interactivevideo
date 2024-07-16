@mod @mod_interactivevideo
Feature: Basic operations with module Interactivevideo
  In order to use Interactivevideo in Moodle
  As a teacher and student
  I need to be able to modify and view Interactivevideo

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email                |
      | student1 | Sam       | Student  | student1@example.com |
      | teacher1 | Terry     | Teacher  | teacher1@example.com |
    And the following "courses" exist:
      | fullname | shortname | category |
      | Course 1 | C1        | 0        |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | student1 | C1     | student        |
      | teacher1 | C1     | editingteacher |

  @javascript
  Scenario: Viewing Interactivevideo module and activities index page
    Given the following "activities" exist:
      | activity | name             | course | intro                   | section |
      | interactivevideo   | Test module name | C1     | Test module description | 1       |
    When I log in as "teacher1"
    And I am on "Course 1" course homepage with editing mode on
    And I add the "Activities" block
    And I log out
    And I log in as "student1"
    And I am on "Course 1" course homepage
    And I click on "Test module name" "link" in the "region-main" "region"
    And I should see "Test module description"
    And I am on "Course 1" course homepage
    And I click on "Interactivevideos" "link" in the "Activities" "block"
    And I should see "1" in the "Test module name" "table_row"

  @javascript
  Scenario: Creating and updating Interactivevideo module
    When I log in as "teacher1"
    And I am on "Course 1" course homepage with editing mode on
    And I add a "Interactivevideo" to section 1 using the activity chooser
    And I set the following fields to these values:
      | Name                               | Test module name        |
      | Description                        | Test module description |
      | Display description on course page | 1                       |
    And I press "Save and return to course"
    And I open "Test module name" actions menu
    And I click on "Edit settings" "link" in the "Test module name" activity
    And I set the field "Name" to "Test module new name"
    And I press "Save and return to course"
    And I should see "Test module new name"
    And I should not see "Test module name"
    And I should see "Test module description"
