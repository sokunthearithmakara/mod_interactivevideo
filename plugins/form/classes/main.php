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

namespace ivplugin_form;

/**
 * Class main
 *
 * @package    ivplugin_form
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class main extends \ivplugin_richtext\main {
    /**
     * Get the property.
     *
     * @return array The property.
     */
    public function get_property() {
        return [
            'name' => 'form',
            'icon' => 'bi bi-input-cursor-text',
            'title' => get_string('formcontent', 'ivplugin_form'),
            'amdmodule' => 'ivplugin_form/main',
            'class' => 'ivplugin_form\\main',
            'form' => 'ivplugin_form\\form',
            'hascompletion' => true,
            'hastimestamp' => true,
            'description' => get_string('formdescription', 'ivplugin_form'),
        ];
    }

    /**
     * Get the content.
     *
     * @param array $arg The arguments.
     * @return string The content.
     */
    public function get_content($arg) {
        global $CFG;
        $content = $arg['content'];
        if ($arg['text1'] > 0) {
            $duedate = userdate($arg['text1'], get_string('strftimedatetime'));
        }
        $id = $arg['id'];
        $contextid = $arg['contextid'];
        $editmode = $arg['editmode'];
        // Process the content from editor for displaying.
        require_once($CFG->libdir . '/filelib.php');
        if ($editmode) {
            // Load the file in the draft area. mod_interactivevideo, content.
            $draftitemid = file_get_submitted_draft_itemid('content');
            $content = file_prepare_draft_area(
                $draftitemid,
                $contextid,
                'mod_interactivevideo',
                'content',
                $id,
                [
                    'maxfiles' => -1,
                    'maxbytes' => 0,
                    'trusttext' => true,
                    'noclean' => true,
                    'context' => $context,
                ],
                $content
            );
        } else {
            // Load the file from the draft area.
            $content = file_rewrite_pluginfile_urls($content, 'pluginfile.php', $contextid, 'mod_interactivevideo', 'content', $id);
        }

        $content = html_entity_decode($content, ENT_QUOTES | ENT_SUBSTITUTE);
        $fields = json_decode($content);
        if (!empty($fields)) {
            $fields = array_map(function ($field) use ($contextid, $id) {
                $field->formattedlabel = format_string($field->label);
                $field->contextid = $contextid;
                $field->annotationid = $id;

                return $field;
            }, $fields);
        }

        $content = [
            'fields' => $fields,
            'duedate' => $duedate,
        ];

        return json_encode($content);
    }
}

