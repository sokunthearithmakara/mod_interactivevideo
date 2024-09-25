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
 * @package     ivplugin_form
 * @copyright   2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace ivplugin_form;

use context;
use MoodleQuickForm;

/**
 * Form class for adding/editing submission form
 * @package ivplugin_form
 * @copyright 2024 Sokunthearith Makara
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class submitform_form extends \core_form\dynamic_form {
    /**
     * Returns form context
     *
     * If context depends on the form data, it is available in $this->_ajaxformdata or
     * by calling $this->optional_param()
     *
     * @return \context
     */
    protected function get_context_for_dynamic_submission(): \context {
        $contextid = $this->optional_param('contextid', null, PARAM_INT);
        return \context::instance_by_id($contextid, MUST_EXIST);
    }

    /**
     * Set data for dynamic submission
     *
     * @return void
     */
    public function set_data_for_dynamic_submission(): void {
        global $CFG, $USER;
        $data = new \stdClass();
        $data->id = $this->optional_param('id', 0, PARAM_INT);
        $data->contextid = $this->optional_param('contextid', null, PARAM_INT);
        $data->completionid = $this->optional_param('completionid', null, PARAM_INT);
        $data->annotationid = $this->optional_param('annotationid', null, PARAM_INT);
        $data->type = $this->optional_param('type', null, PARAM_TEXT);
        $data->courseid = $this->optional_param('courseid', null, PARAM_INT);
        $data->formjson = $this->optional_param('formjson', null, PARAM_RAW);
        $data->submissionid = $this->optional_param('submissionid', null, PARAM_INT);
        $data->editing = $this->optional_param('editing', false, PARAM_BOOL);
        $data->reviewing = $this->optional_param('reviewing', 0, PARAM_INT);
        // Handle filemanager fields.
        if ($data->submissionid > 0 && !$data->editing && !$data->reviewing) {
            $formjson = json_decode($data->formjson);
            $filemanagerfields = array_filter($formjson, function ($field) {
                return $field->type == 'filemanager';
            });

            if (count($filemanagerfields) > 0) {
                require_once($CFG->libdir . '/filelib.php');
                $fs = get_file_storage();
                $files = $fs->get_area_files(
                    $this->get_context_for_dynamic_submission()->id,
                    'mod_interactivevideo',
                    'text1',
                    $data->submissionid,
                );

                foreach ($filemanagerfields as $field) {
                    $fieldid = 'field-' . $field->id;
                    $newdraftitemid = file_get_unused_draft_itemid();
                    foreach ($files as $file) {
                        if ($file->get_filename() == '.') {
                            continue;
                        }
                        // If filename contains the fieldid, then it is the file for this field.
                        if (strpos($file->get_filename(), $fieldid) !== false) {
                            // Put the file in the dratitemid (also remove fieldid prefix from the name).
                            $filerecord = [
                                'contextid' => \context_user::instance($USER->id)->id,
                                'component' => 'user',
                                'filearea'  => 'draft',
                                'itemid'    => $newdraftitemid, // Use the new draft item ID.
                                'filepath'  => $file->get_filepath(),
                                'filename'  => str_replace($fieldid . '_', '', $file->get_filename()),
                            ];

                            // Copy the file to the new draft item ID.
                            if (!$fs->file_exists(
                                $filerecord['contextid'],
                                $filerecord['component'],
                                $filerecord['filearea'],
                                $filerecord['itemid'],
                                $filerecord['filepath'],
                                $filerecord['filename']
                            )) {
                                $fs->create_file_from_storedfile($filerecord, $file);
                            }
                        }
                    }
                    $data->$fieldid = $newdraftitemid;
                }
            }

            // Prepare the data for the editor fields.
            $editorfields = array_filter($formjson, function ($field) {
                return $field->type == 'editor';
            });

            if (count($editorfields) > 0) {
                foreach ($editorfields as $field) {
                    $fieldid = 'field-' . $field->id;
                    $text = $field->default->text;
                    // Rewrite the URLs in the text.
                    $text = file_rewrite_pluginfile_urls(
                        $text,
                        'pluginfile.php',
                        $this->get_context_for_dynamic_submission()->id,
                        'mod_interactivevideo',
                        'text1',
                        $data->submissionid,
                        [
                            'reverse' => true,
                        ]
                    );

                    // Prepare the draft file area.
                    $draftitemid = file_get_submitted_draft_itemid($fieldid);
                    $text = file_prepare_draft_area(
                        $draftitemid,
                        $this->get_context_for_dynamic_submission()->id,
                        'mod_interactivevideo',
                        'text1',
                        $data->submissionid,
                        [
                            'maxfiles' => -1,
                            'maxbytes' => 0,
                            'trusttext' => true,
                            'noclean' => true,
                            'context' => $this->get_context_for_dynamic_submission(),
                        ],
                        $text
                    );

                    $data->{$fieldid}['text'] = str_replace('brokenfile.php#', 'pluginfile.php', $text);
                }
            }
        }

        $this->set_data($data);
    }

    /**
     * Check access for dynamic submission
     *
     * @return mixed
     */
    protected function check_access_for_dynamic_submission(): void {
        require_capability('mod/interactivevideo:view', $this->get_context_for_dynamic_submission());
    }

    /**
     * Form element definition
     *
     * @return void
     */
    public function definition() {
        global $USER;
        $this->render_duration_element();
        $mform = &$this->_form;

        $isedit = $this->optional_param('editing', 0, PARAM_INT);
        $isreviewing = $this->optional_param('reviewing', 0, PARAM_INT);

        $attributes = $mform->getAttributes();
        $attributes['data-name'] = 'submitform-form';
        $attributes['class'] = $attributes['class'] . ' bg-white px-0'
            . ($isreviewing ? ' reviewing' : '') . ($isedit ? ' editing' : '');

        $mform->setAttributes($attributes);
        $mform->addElement('hidden', 'contextid', null);
        $mform->setType('contextid', PARAM_INT);

        $mform->addElement('hidden', 'completionid', null);
        $mform->setType('completionid', PARAM_INT);

        $mform->addElement('hidden', 'submissionid', null);
        $mform->setType('submissionid', PARAM_INT);

        $mform->addElement('hidden', 'type', null);
        $mform->setType('type', PARAM_TEXT);

        $mform->addElement('hidden', 'id', null);
        $mform->setType('id', PARAM_INT);

        $mform->addElement('hidden', 'courseid', null);
        $mform->setType('courseid', PARAM_INT);

        $mform->addElement('hidden', 'annotationid', null);
        $mform->setType('annotationid', PARAM_INT);

        $formjson = $this->optional_param('formjson', null, PARAM_RAW);
        $mform->addElement('hidden', 'formjson', $formjson);

        $fields = json_decode($formjson);

        $mform->addElement('hidden', 'editing', $isedit);
        $mform->setType('editing', PARAM_INT);
        $mform->addElement('hidden', 'reviewing', $isreviewing);
        $mform->setType('reviewing', PARAM_INT);

        foreach ($fields as $field) {
            $field->fieldid = "field-{$field->id}";
            $fieldactions = "<div class=\"px-2 py-1 field-actions \">
            <i class=\"bi bi-pencil-square cursor-pointer mr-3 edit\" data-id=\"{$field->id}\" title=\""
                . get_string('edit', 'mod_interactivevideo') . "\"></i>
            <i class=\"bi bi-copy cursor-pointer mr-3 copy\" data-id=\"{$field->id}\" title=\""
                . get_string('clone', 'mod_interactivevideo') . "\"></i>
            <i class=\"bi bi-trash3 cursor-pointer text-danger delete\" data-id=\"{$field->id}\" title=\""
                . get_string('delete', 'mod_interactivevideo') . "\"></i></div>";
            $label = '<div class="d-flex flex-column">';
            if ($isedit) {
                $label .= $fieldactions;
            }
            $label .= "<div class=\"font-weight-bold field-label\">{$field->label}</div><div class=\"small text-muted d-block\">"
                . str_replace('brokenfile.php#', 'draftfile.php', format_text(
                    $field->helptext->text,
                    FORMAT_HTML,
                    [
                        'context' => $this->get_context_for_dynamic_submission(),
                    ]
                ));
            if ($field->minfiles) {
                $label .= '<span class="mr-3">' . get_string('minfile', 'ivplugin_form') . ": {$field->minfiles}</span>";
            }
            if ($field->maxfiles) {
                $label .= '<span class="mr-3">' . get_string('maxfile', 'ivplugin_form') . ": {$field->maxfiles}</span>";
            }
            if ($field->filemaxsize) {
                $label .= '<span class="mr-3">' . get_string('maxsizeshort', 'ivplugin_form') . ': '
                    . display_size($field->filemaxsize) . '</span>';
            }
            if ($field->minselection) {
                $label .= '<span class="mr-3">' . get_string('minselection', 'ivplugin_form') . ": {$field->minselection}</span>";
            }
            if ($field->maxselection) {
                $label .= '<span class="mr-3">' . get_string('maxselection', 'ivplugin_form') . ": {$field->maxselection}</span>";
            }
            $label .= '</div></div>';
            if ($field->minlength) {
                $min = 'minlength';
                $minvalue = $field->minlength;
                if ($field->type == 'editor') {
                    $min = 'minwords';
                } else if ($field->type == 'text' || $field->type == 'textarea') {
                    $min = 'minchars';
                } else if ($field->type == 'time') {
                    $min = 'aftertime';
                    $minvalue = userdate(strtotime($field->minlength), get_string('strftimetime', 'langconfig'));
                } else if ($field->type == 'week') {
                    $min = 'afterweek';
                    $minvalue = userdate(strtotime($field->minlength), get_string('strftimedatefullshort', 'langconfig'));
                } else if ($field->type == 'month') {
                    $min = 'aftermonth';
                    $minvalue = userdate(strtotime($field->minlength), get_string('strftimemonthyear', 'langconfig'));
                } else if ($field->type == 'date') {
                    $min = 'afterdate';
                    if ($field->includetime) {
                        $minvalue = userdate(strtotime($field->minlength), get_string('strftimedatetimeshort', 'langconfig'));
                    } else {
                        $minvalue = userdate(strtotime($field->minlength), get_string('strftimedatefullshort', 'langconfig'));
                    }
                }
                $label .= '<span class="small text-muted mr-3">' . get_string(
                    $min,
                    'ivplugin_form'
                ) . ": {$minvalue}</span>";
            }
            if ($field->maxlength) {
                $max = 'maxlength';
                $maxvalue = $field->maxlength;
                if ($field->type == 'editor') {
                    $max = 'maxwords';
                } else if ($field->type == 'text' || $field->type == 'textarea') {
                    $max = 'maxchars';
                } else if ($field->type == 'time') {
                    $max = 'beforetime';
                    $maxvalue = userdate(strtotime($field->maxlength), get_string('strftimetime', 'langconfig'));
                } else if ($field->type == 'week') {
                    $max = 'beforeweek';
                    $maxvalue = userdate(strtotime($field->maxlength), get_string('strftimedatefullshort', 'langconfig'));
                } else if ($field->type == 'month') {
                    $max = 'beforemonth';
                    $maxvalue = userdate(strtotime($field->maxlength), get_string('strftimemonthyear', 'langconfig'));
                } else if ($field->type == 'date') {
                    $max = 'beforedate';
                    if ($field->includetime) {
                        $maxvalue = userdate(strtotime($field->maxlength), get_string('strftimedatetimeshort', 'langconfig'));
                    } else {
                        $maxvalue = userdate(strtotime($field->maxlength), get_string('strftimedatefullshort', 'langconfig'));
                    }
                }
                $label .= '<span class="small text-muted mr-3">' . get_string(
                    $max,
                    'ivplugin_form'
                ) . ": {$maxvalue}</span>";
            }

            switch ($field->type) {
                case 'header':
                    $label = $field->label;
                    if ($isedit) {
                        $label .= $fieldactions;
                    }
                    $mform->addElement('header', $field->fieldid, $label);

                    $mform->setExpanded($field->fieldid, $isreviewing ? true : $field->expanded);
                    if ($field->helptext->text) {
                        $mform->addElement('html', '<div class="small text-muted">' . str_replace(
                            'brokenfile.php#',
                            'draftfile.php',
                            format_text($field->helptext->text, FORMAT_HTML, [
                                'context' => $this->get_context_for_dynamic_submission(),
                            ])
                        ) . '</div>');
                    }
                    $mform->closeHeaderBefore('field-' . $field->closeat);
                    break;
                case 'text':
                    $mform->addElement('text', $field->fieldid, $label, [
                        'size' => 100,
                        'placeholder' => $field->placeholder,
                        'id' => $field->fieldid,
                    ]);
                    $mform->setType($field->fieldid, PARAM_TEXT);
                    $mform->setDefault($field->fieldid, $field->default);
                    if ($field->minlength) {
                        $mform->addRule(
                            $field->fieldid,
                            get_string('minlength', 'ivplugin_form'),
                            'minlength',
                            $field->minlength,
                            'client'
                        );
                    }
                    if ($field->maxlength) {
                        $mform->addRule(
                            $field->fieldid,
                            get_string('maxlength', 'ivplugin_form'),
                            'maxlength',
                            $field->maxlength,
                            'client'
                        );
                    }
                    if ($field->regex) {
                        // If regex does not start and end with /, add it.
                        if (substr($field->regex, 0, 1) !== '/' && substr($field->regex, -1) !== '/') {
                            $field->regex = '/' . $field->regex . '/';
                        }
                        $mform->addRule($field->fieldid, format_string($field->regexerror), 'regex', $field->regex, 'client');
                    }
                    $mform->disabledIf($field->fieldid, 'reviewing', 'eq', 1);
                    break;
                case 'html':
                    $htmlgroup = [];
                    $htmlgroup[] = $mform->createElement('html', ($isedit ? $fieldactions : '') . str_replace(
                        'brokenfile.php#',
                        'draftfile.php',
                        format_text($field->content->text, FORMAT_HTML, [
                            'context' => $this->get_context_for_dynamic_submission(),
                        ])
                    ));
                    $mform->addGroup($htmlgroup, $field->fieldid, '-', '', false, ['class' => 'fhtml']);
                    break;
                case 'textarea':
                    $mform->addElement('textarea', $field->fieldid, $label, [
                        'rows' => 5,
                        'cols' => 100,
                        'placeholder' => $field->placeholder,
                        'id' => $field->fieldid,
                        'oninput' => 'this.style.height = "";this.style.height = this.scrollHeight + 3 + "px"',
                    ]);
                    $mform->setType($field->fieldid, PARAM_TEXT);
                    $mform->setDefault($field->fieldid, $field->default);
                    if ($field->minlength) {
                        $mform->addRule(
                            $field->fieldid,
                            get_string('minlength', 'ivplugin_form'),
                            'minlength',
                            $field->minlength,
                            'client'
                        );
                    }
                    if ($field->maxlength) {
                        $mform->addRule(
                            $field->fieldid,
                            get_string('maxlength', 'ivplugin_form'),
                            'maxlength',
                            $field->maxlength,
                            'client'
                        );
                    }
                    $mform->disabledIf($field->fieldid, 'reviewing', 'eq', 1);
                    break;
                case 'editor':
                    if ($isreviewing) {
                        $html = '<div id="' . $field->fieldid . '" class="fitem row form-group d-block flex-column">'
                            . $label . '<div>' . format_text($field->default->text, FORMAT_HTML, [
                                'context' => $this->get_context_for_dynamic_submission(),
                            ]);

                        $html .= '</div></div>';
                        $mform->addElement('html', $html);
                    } else {
                        $mform->addElement(
                            'editor',
                            $field->fieldid,
                            $label,
                            ['rows' => $field->height, 'id' => $field->fieldid],
                            $this->editor_options($field->allowfiles)
                        );
                        $mform->setType($field->fieldid, PARAM_RAW);
                        $mform->setDefault($field->fieldid, $field->default);
                    }
                    $mform->hideIf($field->fieldid, 'reviewing', 'eq', 1);
                    break;
                case 'select':
                    // Options are separated by new line and in each line, the key and value are separated by '='.
                    $options = explode("\n", $field->options);

                    if ($field->multiple || $field->useautocomplete) {
                        $optionsarray = []; // Initialize an empty array.
                    } else {
                        $optionsarray = [];
                        $optionsarray[''] = get_string('choose') . '...';
                    }
                    foreach ($options as $option) {
                        list($key, $value) = explode('=', $option, 2); // Split the option into key and value.
                        $key = trim($key);
                        $value = trim($value);
                        if (empty($key) || empty($value)) {
                            continue; // Skip if either key or value is empty.
                        }
                        $optionsarray[$key] = format_string($value); // Use the key as the array key.
                    }
                    $attributes = ['id' => $field->fieldid];
                    if ($field->multiple) {
                        $attributes['multiple'] = true;
                    }
                    if ($field->useautocomplete && !$isreviewing) {
                        $attributes['noselectionstring'] = get_string('choose') . '...';
                        $mform->addElement('autocomplete', $field->fieldid, $label, $optionsarray, $attributes);
                    } else {
                        $mform->addElement('select', $field->fieldid, $label, $optionsarray, $attributes);
                    }

                    $mform->setType($field->fieldid, PARAM_TEXT);
                    $mform->setDefault($field->fieldid, $field->default);
                    $mform->disabledIf($field->fieldid, 'reviewing', 'eq', 1);

                    break;
                case 'advcheckbox':
                    $options = explode("\n", $field->options);
                    $optionsarray = []; // Initialize an empty array.
                    foreach ($options as $option) {
                        list($key, $value) = explode('=', $option, 2); // Split the option into key and value.
                        $key = trim($key);
                        $value = trim($value);
                        if (empty($key) || empty($value)) {
                            continue; // Skip if either key or value is empty.
                        }
                        $optionsarray[$key] = format_string($value); // Use the key as the array key.
                    }
                    // Make sure the options are unique.
                    $optionsarray = array_unique($optionsarray);
                    $advcheckboxgroups = [];
                    foreach ($optionsarray as $key => $value) {
                        $advcheckboxgroups[] = $mform->createElement(
                            'advcheckbox',
                            $key,
                            '',
                            $value . '<span class="mr-2"></span>',
                            ['group' => 1],
                            ['', $key]
                        );
                        $mform->setType($key, PARAM_TEXT);
                    }

                    if ($field->allowother) {
                        $advcheckboxgroups[] = $mform->createElement(
                            'advcheckbox',
                            'otheroption',
                            '',
                            '<span class="text-muted">' . get_string('otheroption', 'ivplugin_form') . ' ...</span>',
                            ['group' => 1],
                            ['', 'otheroption']
                        );
                        $mform->setType('other', PARAM_TEXT);

                        $advcheckboxgroups[] = $mform->createElement(
                            'text',
                            'otheroptiontext',
                            '',
                            [
                                'size' => 100,
                                'placeholder' => get_string('specifyresponse', 'ivplugin_form'),
                            ]
                        );
                        $mform->setType($field->fieldid . '[otheroptiontext]', PARAM_TEXT);
                        $mform->hideIf($field->fieldid . '[otheroptiontext]', $field->fieldid . '[otheroption]');
                    }

                    $attributes = [];
                    if ($field->display_vertical == '1') {
                        $attributes['class'] = 'checkbox-vertical';
                    }
                    $mform->addGroup($advcheckboxgroups, $field->fieldid, $label, '', true, $attributes);
                    $defaults = $field->default;
                    foreach ($defaults as $key => $value) {
                        $mform->setDefault($field->fieldid . '[' . $key . ']', $value);
                    }

                    $mform->disabledIf($field->fieldid, 'reviewing', 'eq', 1);

                    break;
                case 'radio':
                    $options = explode("\n", $field->options);
                    $optionsarray = [];
                    foreach ($options as $option) {
                        list($key, $value) = explode('=', $option, 2);
                        $key = trim($key);
                        $value = trim($value);
                        if (empty($key) || empty($value)) {
                            continue;
                        }
                        $optionsarray[$key] = format_string($value);
                    }
                    // Make sure the options are unique.
                    $optionsarray = array_unique($optionsarray);
                    // Get the first key to use as the default value if no default is set.
                    $first = array_key_first($optionsarray);
                    if ($field->default == '' && $field->required) {
                        $field->default = $first;
                    }
                    $radiogroup = [];
                    if (!$field->required) {
                        $radiogroup[] = $mform->createElement(
                            'radio',
                            $field->fieldid,
                            '',
                            '<span class="text-muted">' . get_string('noneoption', 'ivplugin_form') . '</span>',
                            ''
                        );
                    }
                    foreach ($optionsarray as $key => $value) {
                        $radiogroup[] = $mform->createElement(
                            'radio',
                            $field->fieldid,
                            '',
                            format_string($value) . '<span class="mr-2"></span>',
                            $key
                        );
                    }

                    if ($field->allowother) {
                        $radiogroup[] = $mform->createElement(
                            'radio',
                            $field->fieldid,
                            '',
                            '<span class="text-muted">' . get_string('otheroption', 'ivplugin_form') . ' ...</span>',
                            'otheroption'
                        );
                        $radiogroup[] = $mform->createElement(
                            'text',
                            $field->fieldid . '-otheroptiontext',
                            '',
                            [
                                'size' => 100,
                                'placeholder' => get_string('specifyresponse', 'ivplugin_form'),
                            ]
                        );
                        $mform->setType($field->fieldid . '-otheroptiontext', PARAM_TEXT);
                    }
                    $attributes = [];
                    if ($field->display_vertical == '1') {
                        $attributes['class'] = 'radio-vertical';
                    }
                    $mform->addGroup($radiogroup, $field->fieldid, $label, '', false, $attributes);
                    $mform->setDefault($field->fieldid, $field->default);
                    $mform->setType($field->fieldid, PARAM_TEXT);
                    $mform->disabledIf($field->fieldid, 'reviewing', 'eq', 1);
                    $mform->hideIf($field->fieldid . '-otheroptiontext', $field->fieldid, 'neq', 'otheroption');
                    $mform->setDefault($field->fieldid . '-otheroptiontext', $field->othertext);
                    break;
                case 'duration':
                    $attributes = ['id' => $field->fieldid];
                    $attributes['optional'] = true;

                    if ($field->units) {
                        $attributes['units'] = $field->units;
                    }

                    $mform->addElement('ivduration', $field->fieldid, $label, $attributes);

                    $default = [];
                    if ($field->default) {
                        $default['number'] = $field->default->number;
                        $default['timeunit'] = $field->default->timeunit;
                        $default['enabled'] = $field->default->enabled;
                    }
                    $mform->setDefault($field->fieldid, $default);
                    $mform->disabledIf($field->fieldid, 'reviewing', 'eq', 1);
                    break;
                case 'date_selector':
                    $attributes = ['id' => $field->fieldid];
                    $attributes['optional'] = true;

                    if ($field->includetime) {
                        $mform->addElement('date_time_selector', $field->fieldid, $label, $attributes);
                    } else {
                        $mform->addElement('date_selector', $field->fieldid, $label, $attributes);
                    }

                    $default = [];
                    if ($field->default) {
                        $default['day'] = $field->default->day;
                        $default['month'] = $field->default->month;
                        $default['year'] = $field->default->year;
                        $default['hour'] = $field->default->hour;
                        $default['minute'] = $field->default->minute;
                        $default['enabled'] = $field->default->enabled;
                    }
                    $mform->setDefault($field->fieldid, $default);
                    $mform->disabledIf($field->fieldid, 'reviewing', 'eq', 1);

                    break;
                case 'filemanager':
                    if ($USER->id == 1) {
                        $html = '<div id="' . $field->fieldid . '" class="fitem row form-group d-block flex-column w-100">'
                            . $label . '<div class="alert alert-warning mt-3">' .
                            get_string('guestmustlogintouploadfiles', 'ivplugin_form') . '</div></div>';
                        $htmlgroup = [];
                        $htmlgroup[] = $mform->createElement('html', $html);
                        $mform->addGroup($htmlgroup, $field->fieldid, '-', '', false, ['class' => 'fhtml']);
                        break;
                    }
                    if ($isreviewing) {
                        $html = '<div id="' . $field->fieldid . '" class="fitem row form-group d-block flex-column">'
                            . $label . '<div>' . format_text(
                                $field->content->text,
                                FORMAT_HTML,
                                [
                                    'context' => $this->get_context_for_dynamic_submission(),
                                ]
                            );
                        $files = $field->default;
                        if (!empty($files)) {
                            $html .= '<ul class="pl-3">';
                            foreach ($files as $file) {
                                $filename = explode('/', $file);
                                $filename = end($filename);
                                $filename = urldecode($filename);
                                // Remove the fieldid prefix from the filename.
                                $filename = str_replace($field->fieldid . '_', '', $filename);
                                $html .= '<li><i class="bi bi-file-earmark-arrow-down mr-2"></i><a target="_blank" href="'
                                    . $file . '">' . $filename . '</a></li>';
                            }
                            $html .= '</ul>';
                        }
                        $html .= '</div></div>';
                        $mform->addElement('html', $html);
                    } else {
                        $options = [
                            'subdirs' => 0,
                            'context' => $this->get_context_for_dynamic_submission(),
                            'accepted_types' => !empty($field->filetypes) ? explode(',', $field->filetypes) : '*',
                        ];
                        if ($field->maxfiles) {
                            $options['maxfiles'] = $field->maxfiles;
                        }
                        if ($field->filemaxsize) {
                            $options['maxbytes'] = $field->filemaxsize;
                        }
                        $mform->addElement('filemanager', $field->fieldid, $label, ['id' => $field->fieldid], $options);
                    }
                    break;
                case 'linebreak':
                    $mform->addElement('static', $field->fieldid, $label, '<hr>', ['id' => $field->fieldid]);
                    break;
                case 'time':
                    $mform->addElement('text', $field->fieldid, $label, [
                        'size' => 100,
                        'id' => $field->fieldid,
                        'min' => $field->minlength,
                        'max' => $field->maxlength,
                        'data-type' => 'time',
                    ]);
                    $mform->setType($field->fieldid, PARAM_TEXT);
                    $mform->setDefault($field->fieldid, $field->default);
                    $mform->disabledIf($field->fieldid, 'reviewing', 'eq', 1);
                    break;
                case 'week':
                    $mform->addElement('text', $field->fieldid, $label, [
                        'size' => 100,
                        'id' => $field->fieldid,
                        'data-type' => 'week',
                        'min' => $field->minlength,
                        'max' => $field->maxlength,
                        'placeholder' => 'YYYY-W##',
                    ]);
                    $mform->setType($field->fieldid, PARAM_TEXT);
                    $mform->setDefault($field->fieldid, $field->default);
                    $mform->addRule(
                        $field->fieldid,
                        get_string('invalidformat', 'ivplugin_form'),
                        'regex',
                        '/^\d{4}-W(0[1-9]|[1-4][0-9]|5[0-3])$/',
                        'client'
                    );
                    $mform->disabledIf($field->fieldid, 'reviewing', 'eq', 1);
                    break;
                case 'month':
                    $mform->addElement('text', $field->fieldid, $label, [
                        'size' => 100,
                        'id' => $field->fieldid,
                        'data-type' => 'month',
                        'placeholder' => 'YYYY-MM',
                    ]);
                    $mform->setType($field->fieldid, PARAM_TEXT);
                    $mform->setDefault($field->fieldid, $field->default);
                    $mform->addRule(
                        $field->fieldid,
                        get_string('invalidformat', 'ivplugin_form'),
                        'regex',
                        '/^([0-9]{4})-(0[1-9]|1[1-2])$/',
                        'client'
                    );
                    $mform->disabledIf($field->fieldid, 'reviewing', 'eq', 1);
                    break;
                case 'date':
                    $mform->addElement('text', $field->fieldid, $label, [
                        'id' => $field->fieldid,
                        'optional' => true,
                        'min' => $field->minlength,
                        'max' => $field->maxlength,
                        'data-type' => $field->includetime ? 'datetime' : 'date',
                    ]);
                    if ($field->includetime) {
                        $default = $field->default;
                    } else {
                        $default = explode('T', $field->default);
                        $default = $default[0];
                    }
                    $mform->setType($field->fieldid, PARAM_TEXT);
                    $mform->setDefault($field->fieldid, $default);
                    $mform->disabledIf($field->fieldid, 'reviewing', 'eq', 1);
                    break;
                case 'range':
                    $label .= '<span class="float-right">' . get_string('currentvalue', 'ivplugin_form')
                        . ': <span class="selected-value">'
                        . ($field->default ?? '-') . '</span></span>';
                    $mform->addElement('text', $field->fieldid, $label, [
                        'size' => 100,
                        'id' => $field->fieldid,
                        'data-type' => 'range',
                        'min' => $field->minlength,
                        'max' => $field->maxlength,
                        'step' => $field->step,
                        'oninput' => 'this.closest(".row").querySelector(".selected-value").textContent = this.value',
                    ]);
                    $mform->setType($field->fieldid, PARAM_TEXT);
                    $mform->setDefault($field->fieldid, $field->default);
                    $mform->disabledIf($field->fieldid, 'reviewing', 'eq', 1);
                    break;
            }
            if ($field->required && !$isreviewing) {
                $mform->addRule($field->fieldid, get_string('required'), 'required', null, 'client');
            }
        }

        $actionbuttons = '<div class="d-flex justify-content-end mt-3 mb-3" id="form-action-btns">';
        if (!$isedit && !$isreviewing) {
            if ($this->optional_param('submissionid', 0, PARAM_INT) > 0) {
                $actionbuttons .= '<button class="btn btn-primary mr-2" id="submitform-submit">'
                    . get_string('savechanges') . '</button><button class="btn btn-secondary" id="cancel-submit">'
                    . get_string('cancel') . '</button>';
            } else {
                $actionbuttons .= '<button class="btn btn-primary" id="submitform-submit">' . get_string('submit')
                    . '</button>';
            }
        }
        $actionbuttons .= '</div>';

        $buttonarray = [];
        $buttonarray[] = &$mform->createElement('html', $actionbuttons);
        $mform->addGroup($buttonarray, 'buttonar', '', [], false);
        $mform->closeHeaderBefore('buttonar');

        $this->set_display_vertical();
    }

    /**
     * Process dynamic submission
     *
     * @return void
     */
    public function process_dynamic_submission() {
        global $CFG, $DB, $USER;
        require_once($CFG->libdir . '/filelib.php');
        $fs = get_file_storage();
        $data = $this->_ajaxformdata;
        // We have find the filemanager field and process it.
        $formjson = json_decode($data['formjson']);
        $usercontext = \context_user::instance($USER->id);
        unset($data['sesskey']); // We do not need to return sesskey.
        unset($data['_qf__' . $this->_formname]);   // We do not need the submission marker too.
        unset($data['formjson']);
        $data['userid'] = $USER->id;
        $data['timecreated'] = time();
        $data['timemodified'] = time();
        $data['cmid'] = (int)$data['annotationid'];
        $data['annotationid'] = (int)$data['id'];
        $submissionid = $data['submissionid'];
        if (!$submissionid) {
            $data['id'] = $DB->insert_record('interactivevideo_log', $data);
        } else {
            $data['id'] = $submissionid;
        }

        $data['contextid'] = (int)$data['contextid'];
        $data['completionid'] = (int)$data['completionid'];
        $newdraftitemid = file_get_unused_draft_itemid();
        $filemanagerfields = array_filter($formjson, function ($field) {
            return $field->type == 'filemanager';
        });

        if (count($filemanagerfields) > 0) {
            foreach ($filemanagerfields as $field) {
                $fieldid = 'field-' . $field->id;
                $draftitemid = $data[$fieldid];
                $data[$fieldid] = [];

                $files = $fs->get_area_files(
                    $usercontext->id,
                    'user',
                    'draft',
                    $draftitemid,
                    'filesize DESC',
                );
                foreach ($files as $file) {
                    if ($file->get_filename() == '.') {
                        continue;
                    }
                    // Define the new file record for the copied file.
                    $filerecord = [
                        'contextid' => $usercontext->id,
                        'component' => 'user',
                        'filearea'  => 'draft',
                        'itemid'    => $newdraftitemid, // Use the new draft item ID.
                        'filepath'  => $file->get_filepath(),
                        'filename'  => $fieldid . '_' . $file->get_filename(),
                    ];

                    // Copy the file to the new draft item ID.
                    if (!$fs->file_exists(
                        $filerecord['contextid'],
                        $filerecord['component'],
                        $filerecord['filearea'],
                        $filerecord['itemid'],
                        $filerecord['filepath'],
                        $filerecord['filename']
                    )) {
                        $fs->create_file_from_storedfile($filerecord, $file);
                    }

                    $url = \moodle_url::make_draftfile_url(
                        $filerecord['itemid'],
                        $filerecord['filepath'],
                        $filerecord['filename']
                    )->out();

                    // Replace the base url with @@PLUGINFILE@@.
                    $url = str_replace($CFG->wwwroot . '/draftfile.php/' . $usercontext->id
                        . '/user/draft/' . $filerecord['itemid'], '@@PLUGINFILE@@', $url);

                    $data[$fieldid][] = $url;
                }
            }
        }

        $editorfields = array_filter($formjson, function ($field) {
            return $field->type == 'editor';
        });

        if (count($editorfields) > 0) {
            $usercontext = \context_user::instance($USER->id);
            foreach ($editorfields as $field) {
                $fieldid = 'field-' . $field->id;
                $draftitemid = $data[$fieldid]['itemid'];
                $text = $data[$fieldid]['text'];

                // Get urls from the text.
                $urls = extract_draft_file_urls_from_text($text);
                foreach ($urls as $url) {
                    $filename = explode('?time=', urldecode($url['filename']))[0];
                    file_copy_file_to_file_area($url, $filename, $newdraftitemid);
                    $oldurl = $url[0];
                    $text = str_replace($oldurl, '@@PLUGINFILE@@/' . $url['filename'], $text);
                }

                $data[$fieldid]['text'] = $text;
            }
        }

        // Save the files in the newdraftitemid.
        file_save_draft_area_files(
            $newdraftitemid,
            $data['contextid'],
            'mod_interactivevideo',
            'text1',
            $data['id']
        );

        $text1 = json_encode($data);

        $data = (object)$data;
        $data->text1 = $text1;

        $DB->update_record('interactivevideo_log', $data);

        return $data;
    }

    /**
     * Validate dynamic submission
     *
     * @param array $data
     * @param array $files
     * @return array
     */
    public function validation($data, $files) {
        $errors = [];
        $formjson = json_decode($data['formjson']);

        // Handle filemanager fields min/max files validation.
        $filemanagerfields = array_filter($formjson, function ($field) {
            return $field->type == 'filemanager' && $field->required == 1;
        });
        foreach ($filemanagerfields as $field) {
            $fieldid = 'field-' . $field->id;
            $draftitemid = $data[$fieldid];
            $files = $this->get_draft_files($draftitemid);
            if (count($files) < $field->minfiles) {
                $errors[$fieldid] = get_string('youmustuploadfilesatleast', 'ivplugin_form', $field->minfiles);
            }
        }

        // Handle editor fields min/max words validation.
        $editorfields = array_filter($formjson, function ($field) {
            return $field->type == 'editor';
        });
        foreach ($editorfields as $field) {
            $fieldid = 'field-' . $field->id;
            $max = $field->maxlength;
            $min = $field->minlength;
            if ($min || $max) {
                $text = $data[$fieldid]['text'];
                $text = strip_tags($text);
                $length = str_word_count($text);
                if ($min && $length < $min) {
                    $errors[$fieldid] = get_string('mustenteratleastwords', 'ivplugin_form', $min);
                }
                if ($max && $length > $max) {
                    $errors[$fieldid] = get_string('mustenterlessthanwords', 'ivplugin_form', $max);
                }
            }
        }

        // Handle checkbox fields min/max selection validation.
        $checkboxfields = array_filter($formjson, function ($field) {
            return $field->type == 'advcheckbox';
        });
        foreach ($checkboxfields as $field) {
            $fieldid = 'field-' . $field->id;
            $min = $field->minselection;
            $max = $field->maxselection;
            $selections = $data[$fieldid];
            $selectedothertext = $selections['otheroptiontext'];
            unset($selections['otheroptiontext']);
            $selected = 0;
            foreach ($selections as $selection => $value) {
                if ($value) {
                    $selected++;
                }
            }
            if ($min && $selected < $min) {
                $errors[$fieldid] = get_string('youmustselectatleast', 'ivplugin_form', $min);
            }
            if ($max && $selected > $max) {
                $errors[$fieldid] = get_string('youmustselectatmost', 'ivplugin_form', $max);
            }
            if ($selections['otheroption'] && empty($selectedothertext)) {
                $errors[$fieldid] = get_string('youmustspecifyresponse', 'ivplugin_form');
            }
        }

        // Handle time/week/month/date fields min/max validation.
        $timefields = array_filter($formjson, function ($field) {
            return $field->type == 'time' || $field->type == 'week' || $field->type == 'month' || $field->type == 'date';
        });
        foreach ($timefields as $field) {
            $fieldid = 'field-' . $field->id;
            $min = strtotime($field->minlength);
            $max = strtotime($field->maxlength);
            $time = strtotime($data[$fieldid]);
            if ($field->type == 'time') {
                $minstr = userdate($min, get_string('strftimetime', 'langconfig'));
                $maxstr = userdate($max, get_string('strftimetime', 'langconfig'));
                $minerror = 'timemustbeafter';
                $maxerror = 'timemustbebefore';
            } else if ($field->type == 'week') {
                $minstr = userdate($min, get_string('strftimedatefullshort', 'langconfig'));
                $maxstr = userdate($max, get_string('strftimedatefullshort', 'langconfig'));
                $minerror = 'weekmustbeafter';
                $maxerror = 'weekmustbebefore';
            } else if ($field->type == 'month') {
                $minstr = userdate($min, get_string('strftimemonthyear', 'langconfig'));
                $maxstr = userdate($max, get_string('strftimemonthyear', 'langconfig'));
                $minerror = 'monthmustbeafter';
                $maxerror = 'monthmustbebefore';
            } else if ($field->type == 'date') {
                if ($field->includetime) {
                    $minstr = userdate($min, get_string('strftimedatetimeshort', 'langconfig'));
                    $maxstr = userdate($max, get_string('strftimedatetimeshort', 'langconfig'));
                } else {
                    $minstr = userdate($min, get_string('strftimedatefullshort', 'langconfig'));
                    $maxstr = userdate($max, get_string('strftimedatefullshort', 'langconfig'));
                }
                $minerror = 'datemustbeafter';
                $maxerror = 'datemustbebefore';
            }
            if ($min && $time < $min) {
                $errors[$fieldid] = get_string(
                    $minerror,
                    'ivplugin_form',
                    $minstr
                );
            }
            if ($max && $time > $max) {
                $errors[$fieldid] = get_string(
                    $maxerror,
                    'ivplugin_form',
                    $maxstr
                );
            }
        }

        // Handle select fields min/max selection validation.
        $selectfields = array_filter($formjson, function ($field) {
            return $field->type == 'select';
        });
        foreach ($selectfields as $field) {
            $fieldid = 'field-' . $field->id;
            $min = $field->minselection;
            $max = $field->maxselection;
            $selections = $data[$fieldid];
            $selected = 0;
            foreach ($selections as $selection) {
                if ($selection) {
                    $selected++;
                }
            }
            if ($min && $selected < $min) {
                $errors[$fieldid] = get_string('youmustselectatleast', 'ivplugin_form', $min);
            }
            if ($max && $selected > $max) {
                $errors[$fieldid] = get_string('youmustselectatmost', 'ivplugin_form', $max);
            }
        }

        // Handle radio fields otheroption validation.
        $radiofields = array_filter($formjson, function ($field) {
            return $field->type == 'radio';
        });

        foreach ($radiofields as $field) {
            $fieldid = 'field-' . $field->id;
            $otheroption = $data[$fieldid] == 'otheroption';
            if ($otheroption && empty($data[$fieldid . '-otheroptiontext'])) {
                $errors[$fieldid] = get_string('youmustspecifyresponse', 'ivplugin_form');
            }
        }

        return $errors;
    }

    /**
     * Get draft files from a draft item ID
     *
     * @param mixed $draftitemid
     * @return void
     */
    public function get_draft_files($draftitemid) {
        global $USER;
        $usercontext = \context_user::instance($USER->id);
        $fs = get_file_storage();
        $files = $fs->get_area_files(
            $usercontext->id,
            'user',
            'draft',
            $draftitemid,
            'filename',
            false
        );
        return $files;
    }

    /**
     * Returns editor options
     * @param bool $allowfiles
     * @return array
     */
    public function editor_options($allowfiles = true) {
        return [
            'maxfiles' => $allowfiles ? EDITOR_UNLIMITED_FILES : 0,
            'maxbytes' => 0,
            'trusttext' => false,
            'context' => $this->get_context_for_dynamic_submission(),
        ];
    }

    /**
     * Returns page URL for dynamic submission
     *
     * @return \moodle_url
     */
    protected function get_page_url_for_dynamic_submission(): \moodle_url {
        return new \moodle_url('/mod/interactivevideo/interactions.php', [
            'id' => $this->optional_param('annotationid', null, PARAM_INT),
        ]);
    }

    /**
     * Render custom duration element
     *
     * @return void
     */
    public function render_duration_element() {
        global $CFG;
        MoodleQuickForm::registerElementType(
            'ivduration',
            $CFG->dirroot . '/mod/interactivevideo/plugins/form/classes/form_fields/ivduration.php',
            'MoodleQuickForm_ivduration'
        );
    }
}
