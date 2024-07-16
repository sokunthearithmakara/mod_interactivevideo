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
 * Configuration form for adding/editing form element "header"
 *
 * @package     ivplugin_form
 * @copyright   2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

 namespace ivplugin_form\form_fields;

 /**
  * Configuration form for adding/editing form element "header"
  * @package     ivplugin_form
  * @copyright   2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
  * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
  */
class header extends base {

    /**
     * Set data for dynamic submission
     */
    public function set_data_for_dynamic_submission(): void {
        $data = $this->set_data_default();
        $data->expanded = $this->optional_param('expanded', null, PARAM_TEXT);
        $data->closeat = $this->optional_param('closeat', null, PARAM_TEXT);
        $this->set_data($data);
    }

    /**
     * Definition
     *
     * @param null $arg
     */
    public function definition($arg = null) {
        $mform = parent::definition([
            'helptext' => true,
            'required' => false,
        ]);

        // Show expanded.
        $mform->addElement('advcheckbox', 'expanded', '', get_string('showexpanded', 'ivplugin_form'));

        // Close at.
        $fields = $this->optional_param('fields', null, PARAM_TEXT);
        if (empty($fields)) {
            $fields = [];
        } else {
            $fields = json_decode($fields, true);
        }

        $fields = array_filter($fields, function ($field) {
            return $field['type'] !== 'header' && $field['type'] !== 'html'
                && $field['id'] !== $this->optional_param('id', null, PARAM_INT);
        });

        $flds = array_column($fields, 'label', 'id');
        $flds = array_map('format_string', $flds);
        $flds = ['' => get_string('unset', 'ivplugin_form')] + $flds;
        $mform->addElement('select', 'closeat', get_string('closeat', 'ivplugin_form'), $flds);
        $mform->setType('closeat', PARAM_TEXT);

        $this->set_display_vertical();
    }

    /**
     * Process dynamic submission
     *
     * @return mixed
     */
    public function process_dynamic_submission() {
        $fromform = $this->get_data();
        if ($fromform->id == 0) {
            $fromform->id = time();
        }
        $fromform->closeat = $this->_ajaxformdata['closeat'];
        $fromform->formattedlabel = format_string($fromform->label);
        return $fromform;
    }
}
