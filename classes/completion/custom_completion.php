<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

namespace mod_interactivevideo\completion;

use core_completion\activity_custom_completion;

/**
 * Class custom_completion
 *
 * @package    mod_interactivevideo
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class custom_completion extends activity_custom_completion {

    /**
     * Fetches the completion state for a given completion rule.
     *
     * @param string $rule The completion rule.
     * @return int The completion state.
     */
    public function get_state(string $rule): int {
        global $DB;

        $this->validate_rule($rule);

        $userid = $this->userid;
        $cm = $this->cm;
        $completionpercentage = $cm->customdata['customcompletionrules']['completionpercentage'];
        // We must take into account the start and end times of the video as well.
        // Interactions that are outside of the video's start and end times OR within the skipped segment should not be considered for completion.
        $startendtimes = explode("-", $cm->customdata['startendtime']);
        $start = $startendtimes[0];
        $end = $startendtimes[1];
        $select = "annotationid = ? AND timestamp >= ? AND timestamp <= ? AND (hascompletion = 1 OR type = 'skipsegment')";

        $relevantitems = $DB->get_records_select('interactivevideo_items', $select, [$cm->instance, $start, $end]);
        $skipsegment = array_filter($relevantitems, function ($item) {
            return $item->type === 'skipsegment';
        });

        $relevantitems = array_filter($relevantitems, function ($item) use ($skipsegment) {
            foreach ($skipsegment as $ss) {
                if ($item->timestamp > $ss->timestamp && $item->timestamp < $ss->title) {
                    return false;
                }
            }
            if ($item->type === 'skipsegment') {
                return false;
            }
            return true;
        });

        $relevantitems = array_map(function ($item) {
            return $item->id;
        }, $relevantitems);

        $usercompletion = $DB->get_field(
            'interactivevideo_completion',
            'completeditems',
            ['userid' => $userid, 'cmid' => $cm->instance]
        );
        if (!$usercompletion) {
            return COMPLETION_INCOMPLETE;
        }
        $usercompletion = json_decode($usercompletion, true);
        $usercompletion = array_intersect($usercompletion, $relevantitems);
        $usercompletion = count($usercompletion);
        if ($usercompletion > 0) {
            $usercompletion = ($usercompletion / count($relevantitems)) * 100;
        } else {
            $usercompletion = 0;
        }
        if ($usercompletion >= $completionpercentage) {
            return COMPLETION_COMPLETE;
        }
        return COMPLETION_INCOMPLETE;
    }

    /**
     * Fetch the list of custom completion rules that this module defines.
     *
     * @return array
     */
    public static function get_defined_custom_rules(): array {
        return ['completionpercentage'];
    }

    /**
     * Returns an associative array of the descriptions of custom completion rules.
     *
     * @return array
     */
    public function get_custom_rule_descriptions(): array {
        $completionpercentage = $this->cm->customdata['customcompletionrules']['completionpercentage'];
        return [
            'completionpercentage' => get_string('completiondetail:percentage', 'interactivevideo', $completionpercentage),
        ];
    }

    /**
     * Returns an array of all completion rules, in the order they should be displayed to users.
     *
     * @return array
     */
    public function get_sort_order(): array {
        return [
            'completionview',
            'completionpercentage',
            'completionusegrade',
            'completionpassgrade',
        ];
    }
}
