<?php
// This file is part of Moodle - https://moodle.org/
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
// along with Moodle.  If not, see <https://www.gnu.org/licenses/>.

/**
 * Dynamic form for adding/editing interactions content
 *
 * @package     ivplugin_discussion
 * @copyright   2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */


namespace ivplugin_discussion;

/**
 * Dynamic form for adding/editing discussion content
 *
 * @package     ivplugin_discussion
 * @copyright   2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class form extends \mod_interactivevideo\form\base_form {

    /**
     * Sets data for dynamic submission
     * @return void
     */
    public function set_data_for_dynamic_submission(): void {
        $data = $this->set_data_default();
        $data->completionrequirements = new \stdClass();
        if (!empty($data->contentform)) {
            $draftideditor = file_get_submitted_draft_itemid('content');
            $data->content = [];
            $data->content["text"] = file_prepare_draft_area(
                $draftideditor,
                $data->contextid,
                'mod_interactivevideo',
                'content',
                $data->id,
                $this->editor_options(),
                $data->contentform ?? ''
            );
            $data->content["format"] = FORMAT_HTML;
            $data->content["itemid"] = $data->id;
        }
        $this->set_data($data);
    }

    /**
     * Process dynamic submission
     *
     * @return void
     */
    public function process_dynamic_submission() {
        global $DB;
        // We're going to submit the data to database. If id is not 0, we're updating an existing record.
        $fromform = $this->get_data();
        $fromform->text1 = json_encode($fromform->completionrequirements);
        $fromform->advanced = $this->process_advanced_settings($fromform);
        if ($fromform->id > 0) {
            $fromform->timemodified = time();
            $fromform->content = $fromform->content["text"];
            $DB->update_record('interactivevideo_items', $fromform);
        } else {
            $fromform->timecreated = time();
            $fromform->timemodified = $fromform->timecreated;
            $fromform->content = $fromform->content["text"];
            $fromform->id = $DB->insert_record('interactivevideo_items', $fromform);
        }

        $draftitemid = file_get_submitted_draft_itemid('content');
        $fromform->content = file_save_draft_area_files(
            $draftitemid,
            $fromform->contextid,
            'mod_interactivevideo',
            'content',
            $fromform->id,
            $this->editor_options(),
            $fromform->content
        );
        $DB->update_record('interactivevideo_items', $fromform);

        return $fromform;
    }

    /**
     * Defines form elements
     *
     * @return void
     */
    public function definition() {
        $mform = &$this->_form;

        $this->standard_elements();

        $mform->addElement('text', 'title', '<i class="bi bi-quote mr-2"></i>' . get_string('title', 'mod_interactivevideo'));
        $mform->setType('title', PARAM_TEXT);
        $mform->setDefault('title', get_string('defaulttitle', 'mod_interactivevideo'));
        $mform->addRule('title', get_string('required'), 'required', null, 'client');

        $mform->addElement(
            'editor',
            'content',
            '<i class="bi bi-file-earmark-richtext mr-2"></i>' . get_string('discussiondescriptiontext', 'ivplugin_discussion'),
            null,
            $this->editor_options()
        );
        $mform->setType('content', PARAM_RAW);
        $mform->addRule('content', get_string('required'), 'required', null, 'client');
        $mform->addElement(
            'advcheckbox',
            'char1', // Require response before viewing others
            '',
            get_string('requireresponsebeforeviewingothers', 'ivplugin_discussion'),
            ["group" => 1],
            [0, 1]
        );
        $mform->setType("char1", PARAM_INT);
        $mform->setDefault("char1", 1);

        $this->xp_form_field(0);

        $mform->addElement('select', 'completiontracking', '<i class="bi bi-check2-square mr-2"></i>' . get_string('completiontracking', 'mod_interactivevideo'), [
            'manual' => get_string('completionmanual', 'mod_interactivevideo'),
            'complete' => get_string('completiononrequirementmet', 'ivplugin_discussion'),
        ]);
        $mform->setType('completiontracking', PARAM_TEXT);

        $text = json_decode($this->optional_param('text1', null, PARAM_RAW));

        $elementarray = [];
        $elementarray[] = $mform->createElement(
            'advcheckbox',
            'respondtodiscussion',
            '',
            get_string('respondtodiscussion', 'ivplugin_discussion'),
            ["group" => 1],
            [0, 1]
        );
        $mform->setDefault('completionrequirements[respondtodiscussion]', (int)$text->respondtodiscussion ?? 1);
        $elementarray[] = $mform->createElement(
            'advcheckbox',
            'replytoresponse',
            '',
            get_string('replytoresponse', 'ivplugin_discussion'),
            ["group" => 1],
            [0, 1]
        );
        $mform->setDefault("completionrequirements[replytoresponse]", (int)$text->replytoresponse ?? 0);
        $elementarray[] = $mform->createElement(
            'text',
            'numberofresponses',
            get_string('numberofresponses', 'ivplugin_discussion'),
            ['size' => 5]
        );
        $mform->setType('completionrequirements[numberofresponses]', PARAM_INT);
        $mform->setDefault('completionrequirements[numberofresponses]', (int)($text->numberofresponses) > 0 ? (int)($text->numberofresponses) : 1);
        $mform->hideIf('completionrequirements[numberofresponses]', 'completionrequirements[replytoresponse]', 'eq', 0);
        $mform->addGroup($elementarray, 'completionrequirements', get_string('completionrequirements', 'ivplugin_discussion'));
        $mform->hideIf('completionrequirements', 'completiontracking', 'eq', 'manual');
        $mform->addGroupRule(
            'completionrequirements',
            ['numberofresponses' => [
                [get_string('numeric', 'mod_interactivevideo'), 'numeric', null, 'client'],
                [get_string('nonzero', 'mod_interactivevideo'), 'nonzero', null, 'client'],
            ]]
        );
        $this->display_options_field();
        $this->advanced_form_fields(true, true, true, true);

        $this->close_form();
    }
}
