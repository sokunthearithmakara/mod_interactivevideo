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

namespace ivplugin_pdfviewer;

/**
 * Class form
 *
 * @package    ivplugin_pdfviewer
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class form extends \mod_interactivevideo\form\base_form {

    /**
     * Sets data for dynamic submission
     * @return void
     */
    public function set_data_for_dynamic_submission(): void {
        global $CFG;

        $data = $this->set_data_default();

        require_once($CFG->libdir . '/filelib.php');

        // Load the file in the draft area. mod_interactive, content.
        $draftitemid = file_get_submitted_draft_itemid('content');
        file_prepare_draft_area($draftitemid, $data->contextid, 'mod_interactivevideo', 'content', $data->id);

        $data->content = $draftitemid;

        $this->set_data($data);
    }

    /**
     * Process dynamic submission
     *
     * @return void
     */
    public function process_dynamic_submission() {
        $fromform = parent::process_dynamic_submission();

        $draftitemid = $fromform->content;
        file_save_draft_area_files(
            $draftitemid,
            $fromform->contextid,
            'mod_interactivevideo',
            'content',
            $fromform->id,
        );

        return $fromform;
    }

    /**
     * Form definition
     *
     * @return void
     */
    public function definition() {
        global $PAGE;
        $mform = &$this->_form;

        $this->standard_elements();

        $mform->addElement('text', 'title', '<i class="bi bi-quote mr-2"></i>' . get_string('title', 'mod_interactivevideo'));
        $mform->setType('title', PARAM_TEXT);
        $mform->setDefault('title', get_string('defaulttitle', 'mod_interactivevideo'));
        $mform->addRule('title', get_string('required'), 'required', null, 'client');

        // PDF upload.
        $filemanageroptions = [
            'maxbytes'       => $PAGE->course->maxbytes,
            'subdirs'        => 0,
            'maxfiles'       => 1,
            'accepted_types' => ['.pdf'],
        ];

        $mform->addElement(
            'filemanager',
            'content',
            '<i class="bi bi-file-pdf mr-2"></i>' . get_string('pdffile', 'ivplugin_pdfviewer'),
            null,
            $filemanageroptions
        );
        $mform->addRule(
            'content',
            get_string('required'),
            'required',
            null,
            'client'
        );

        $this->xp_form_field();
        $mform->addElement(
            'select',
            'completiontracking',
            '<i class="bi bi-check2-square mr-2"></i>' . get_string('completiontracking', 'mod_interactivevideo'),
            [
                'manual' => get_string('completionmanual', 'mod_interactivevideo'),
                'scrolltolastpage' => get_string('completiononscrolltolastpage', 'ivplugin_pdfviewer'),
            ]
        );
        $mform->setType('completiontracking', PARAM_TEXT);

        $this->display_options_field();
        $this->advanced_form_fields(true, true, true, true);
        $this->close_form();
    }
}
