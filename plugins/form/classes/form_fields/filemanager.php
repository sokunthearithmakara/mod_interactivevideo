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
 * Configuration form for adding/editing form element "filemanager"
 *
 * @package     ivplugin_form
 * @copyright   2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

 namespace ivplugin_form\form_fields;

/**
 * Configuration form for adding/editing form element "filemanager"
 * @package     ivplugin_form
 * @copyright   2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class filemanager extends base {

    /**
     * Set data for dynamic submission
     */
    public function set_data_for_dynamic_submission(): void {
        $data = $this->set_data_default();
        $data->filemaxsize = $this->optional_param('filemaxsize', null, PARAM_INT);
        $data->maxfiles = $this->optional_param('maxfiles', null, PARAM_INT);
        $data->minfiles = $this->optional_param('minfiles', null, PARAM_INT);
        $data->filetypes = $this->optional_param('filetypes', null, PARAM_RAW);
        $data->filetypes = str_replace(',', ' ', $data->filetypes);
        $this->set_data($data);
    }

    /**
     * Definition
     *
     * @param null $arg
     */
    public function definition($arg = null) {
        global $CFG, $PAGE;
        $mform = parent::definition([
            'helptext' => true,
            'required' => true,
        ]);

        // File types.
        $mform->addElement('filetypes', 'filetypes', get_string('filetypes', 'ivplugin_form')); // File types.
        $defaultfiletypes = '.doc .docx .pdf web_image';
        $mform->setDefault('filetypes', $defaultfiletypes);

        // Max size.
        $choices = get_max_upload_sizes(
            $CFG->maxbytes,
            $PAGE->course->maxbytes
        );

        $mform->addElement(
            'select',
            'filemaxsize',
            get_string('maxsize', 'ivplugin_form'),
            $choices
        ); // Max bytes.

        // Min number of files.
        $mform->addElement('text', 'minfiles', get_string('minfiles', 'ivplugin_form'));
        $mform->setType('minfiles', PARAM_INT);
        $mform->addRule('minfiles', get_string('numeric', 'ivplugin_form'), 'numeric', null, 'client', true);
        $mform->setDefault('minfiles', 0);

        // Max number of files.
        $mform->addElement('text', 'maxfiles', get_string('maxfiles', 'ivplugin_form'));
        $mform->setType('maxfiles', PARAM_INT);
        $mform->addRule('maxfiles', get_string('numeric', 'ivplugin_form'), 'numeric', null, 'client', true);
        $mform->setDefault('maxfiles', 1);

        $this->set_display_vertical();
    }
}
