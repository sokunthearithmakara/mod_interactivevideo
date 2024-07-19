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

defined('MOODLE_INTERNAL') || die();

require_once($CFG->dirroot . '/course/moodleform_mod.php');

/**
 * Form for adding and editing Interactivevideo instances
 *
 * @package    mod_interactivevideo
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class mod_interactivevideo_mod_form extends moodleform_mod {

    /**
     * Defines forms elements
     */
    public function definition() {
        global $CFG, $PAGE, $USER;

        $current = $this->current;

        $mform = $this->_form;

        if (isset($current->source) && $current->source == 'file') {
            $modulecontext = context_module::instance($current->update);
            $fs = get_file_storage();
            $files = $fs->get_area_files(
                $modulecontext->id,
                'mod_interactivevideo',
                'video',
                0,
                'id',
            );
            $file = reset($files);
            if ($file) {
                $url = moodle_url::make_pluginfile_url(
                    $file->get_contextid(),
                    $file->get_component(),
                    $file->get_filearea(),
                    $file->get_itemid(),
                    $file->get_filepath(),
                    $file->get_filename()
                )->out();
                $mform->addElement('hidden', 'videofile', $url);
                $mform->setType('videofile', PARAM_URL);
            }
        }

        $mform->addElement('html', '<div id="video-wrapper" class="mt-2 mb-3" style="display: none;">
                                    <div id="player" style="width:100%; max-width: 100%"></div></div>
                                   ');

        // Adding the "general" fieldset, where all the common settings are shown.
        $mform->addElement('header', 'general', get_string('general', 'form'));

        // Adding the standard "name" field.
        $mform->addElement('text', 'name', get_string('interactivevideoname', 'mod_interactivevideo'), ['size' => '100']);

        if (!empty($CFG->formatstringstriptags)) {
            $mform->setType('name', PARAM_TEXT);
        } else {
            $mform->setType('name', PARAM_CLEANHTML);
        }

        $mform->addRule('name', null, 'required', null, 'client');
        $mform->addRule('name', get_string('maximumchars', '', 255), 'maxlength', 255, 'client');

        $mform->addElement('html', '<div id="warning" class="alert alert-warning d-none"><p>'
            . get_string('completiondisablewarning', 'mod_interactivevideo')
            . '</p><input type="submit" class="btn btn-primary" name="unlockcompletion" id="id_unlockcompletion" value="'
            . get_string('unlockcompletion', 'completion') . '"></div>');

        // Add source selection field.
        $mform->addElement('select', 'source', get_string('source', 'mod_interactivevideo'), [
            'file' => get_string('file', 'mod_interactivevideo'),
            'url' => get_string('url', 'mod_interactivevideo'),
        ]);

        $mform->addRule('source', null, 'required', null, 'client');
        $mform->setDefault('source', 'file');
        $mform->addHelpButton('source', 'source', 'mod_interactivevideo');

        // Add youtube video url field.
        $mform->addElement(
            'text',
            'videourl',
            get_string('videourl', 'mod_interactivevideo'),
            [
                'size' => '100',
                'onkeydown' => 'return (event.ctrlKey && event.key === \'v\') ' .
                    '|| (event.ctrlKey && event.key === \'c\') || (event.ctrlKey && event.key === \'x\') ' .
                    '|| (event.ctrlKey && event.key === \'a\') || event.key === \'Backspace\' ? true : false;',
                'placeholder' => get_string('videourlplaceholder', 'mod_interactivevideo'),
            ]
        );
        $mform->setType('videourl', PARAM_TEXT);
        $mform->hideIf('videourl', 'source', 'eq', 'file');

        // Uploaded video item id.
        $mform->addElement('hidden', 'video', 0);
        $mform->setType('video', PARAM_INT);

        // Add preview button.
        $mform->addElement('button', 'upload', get_string('uploadvideobutton', 'mod_interactivevideo'));
        $mform->hideIf('upload', 'source', 'eq', 'url');

        // Add preview button.
        $mform->addElement('button', 'delete', get_string('deletevideobutton', 'mod_interactivevideo'));
        $mform->hideIf('delete', 'source', 'eq', 'url');

        // Adding start time and end time fields.
        $mform->addElement(
            'text',
            'startassist',
            get_string('start', 'mod_interactivevideo'),
            ['size' => '100', 'placeholder' => '00:00:00']
        );
        $mform->setType('startassist', PARAM_TEXT);
        $mform->setDefault('startassist', "00:00:00");
        $mform->addRule('startassist', null, 'required', null, 'client');

        $mform->addElement(
            'text',
            'endassist',
            get_string('end', 'mod_interactivevideo') . '<br><span class="text-muted small" id="videototaltime"></span>',
            ['size' => '100', 'placeholder' => '00:00:00']
        );
        $mform->setType('endassist', PARAM_TEXT);
        $mform->setDefault('startassist', "00:00:00");
        $mform->addRule('endassist', null, 'required', null, 'client');

        $mform->addElement('hidden', 'start', 0);
        $mform->setType('start', PARAM_INT);
        $mform->addElement('hidden', 'end', 0);
        $mform->setType('end', PARAM_INT);
        $mform->addElement('hidden', 'totaltime', 0);
        $mform->setType('totaltime', PARAM_INT);

        $mform->addElement('hidden', 'type');
        $mform->setType('type', PARAM_TEXT);

        // Adding the standard "intro" and "introformat" fields.
        $this->standard_intro_elements();

        $mform->addElement(
            'advcheckbox',
            'displayasstartscreen',
            '',
            get_string('displayasstartscreen', 'mod_interactivevideo'),
            ['group' => 1],
            [0, 1]
        );

        // End screen text.
        $mform->addElement(
            'editor',
            'endscreentext',
            get_string('endscreentext', 'mod_interactivevideo'),
            null,
            ['maxfiles' => EDITOR_UNLIMITED_FILES, 'noclean' => true]
        );
        $mform->setType('endscreentext', PARAM_RAW);

        $mform->addElement('header', 'videodisplayoptions', get_string('videodisplayoptions', 'mod_interactivevideo'));

        // Dark mode.
        $mform->addElement(
            'advcheckbox',
            'darkmode',
            '',
            get_string('darkmode', 'mod_interactivevideo'),
            ['group' => 1],
            [0, 1]
        );
        $mform->setDefault('darkmode', 1);

        // Disable chapter navigation.
        $mform->addElement(
            'advcheckbox',
            'disablechapternavigation',
            '',
            get_string('disablechapternavigation', 'mod_interactivevideo'),
            ['group' => 1],
            [0, 1]
        );

        // Prevent skipping.
        $mform->addElement(
            'advcheckbox',
            'preventskipping',
            '',
            get_string('preventskipping', 'mod_interactivevideo'),
            ['group' => 1],
            [0, 1]
        );

        // Use orginal video controls.
        $mform->addElement(
            'advcheckbox',
            'useoriginalvideocontrols',
            '',
            get_string('useoriginalvideocontrols', 'mod_interactivevideo'),
            ['group' => 1],
            [0, 1]
        );

        // Hide main video controls.
        $mform->addElement(
            'advcheckbox',
            'hidemainvideocontrols',
            '',
            get_string('hidemainvideocontrols', 'mod_interactivevideo'),
            ['group' => 1],
            [0, 1]
        );

        // Prevent seeking.
        $mform->addElement(
            'advcheckbox',
            'preventseeking',
            '',
            get_string('preventseeking', 'mod_interactivevideo'),
            ['group' => 1],
            [0, 1]
        );

        $mform->hideIf('preventseeking', 'hidemainvideocontrols', 'eq', 1);

        // Prevent seeking.
        $mform->addElement(
            'advcheckbox',
            'hideinteractions',
            '',
            get_string('hideinteractions', 'mod_interactivevideo'),
            ['group' => 1],
            [0, 1]
        );

        $mform->hideIf('hideinteractions', 'hidemainvideocontrols', 'eq', 1);

        // Disable interaction click.
        $mform->addElement(
            'advcheckbox',
            'disableinteractionclick',
            '',
            get_string('disableinteractionclick', 'mod_interactivevideo'),
            ['group' => 1],
            [0, 1]
        );

        $mform->hideIf('disableinteractionclick', 'preventseeking', 'eq', 1);
        $mform->hideIf('disableinteractionclick', 'hidemainvideocontrols', 'eq', 1);
        $mform->hideIf('disableinteractionclick', 'hideinteractions', 'eq', 1);

        // Disable interaction click until completed.
        $mform->addElement(
            'advcheckbox',
            'disableinteractionclickuntilcompleted',
            '',
            get_string('disableinteractionclickuntilcompleted', 'mod_interactivevideo'),
            ['group' => 1],
            [0, 1]
        );

        $mform->hideIf('disableinteractionclickuntilcompleted', 'preventseeking', 'eq', 1);
        $mform->hideIf('disableinteractionclickuntilcompleted', 'disableinteractionclick', 'eq', 1);
        $mform->hideIf('disableinteractionclickuntilcompleted', 'hidemainvideocontrols', 'eq', 1);
        $mform->hideIf('disableinteractionclickuntilcompleted', 'hideinteractions', 'eq', 1);

        // Add standard grade elements.
        $this->standard_grading_coursemodule_elements();

        // Add standard elements.
        $this->standard_coursemodule_elements();

        // Add standard buttons.
        $this->add_action_buttons();

        // Add the js.
        $PAGE->requires->js_call_amd('mod_interactivevideo/mod_form', 'init', [
            $current->id ?? 0,
            context_user::instance($USER->id)->id,
        ]);
    }

    /**
     * Custom validation should be added here
     * @param array $data
     * @param array $files
     */
    public function validation($data, $files) {
        $errors = [];

        // Grade must be greater than 0.
        if ($data['grade'] < 0) {
            $errors['grade'] = get_string('gradenonzero', 'mod_interactivevideo');
        }

        // Gradepass must be less than or equal to grade.
        if ($data['grade'] > 0 && $data['gradepass'] > $data['grade']) {
            $errors['gradepass'] = get_string('gradepassgreaterthangrade', 'grades', $data['grade']);
        }

        // Completion percentage must be between 0 and 100.
        if (!empty($data['completionpercentageenabled'])) {
            if (($data['completionpercentage'] < 0 || $data['completionpercentage'] > 100)
                && !empty($data['completionpercentage'])
            ) {
                $errors['completionpercentage'] = get_string('completionpercentageerror', 'mod_interactivevideo');
            }
        }

        // If the source is url, type is required.
        if ($data['source'] == 'url' && empty($data['type'])) {
            $errors['videourl'] = get_string('novideourl', 'mod_interactivevideo');
        }

        // If source is file, video file must be uploaded.
        if ($data['source'] == 'file') {
            if (empty($data['video'])) {
                $errors['upload'] = get_string('novideofile', 'mod_interactivevideo');
            }
        } else {
            // If source is url, video url must be provided.
            if (empty($data['videourl'])) {
                $errors['videourl'] = get_string('novideourl', 'mod_interactivevideo');
            }
        }

        // End time must be greater than 0 & greater than start.
        if ($data['end'] < $data['start']) {
            $errors['endassist'] = get_string('endtimegreaterstarttime', 'mod_interactivevideo');
        }

        return $errors;
    }

    /**
     * Custom data should be added here
     * @param array $default_values
     */
    public function data_preprocessing(&$defaultvalues) {
        if ($this->current->instance) {
            $text = $defaultvalues['endscreentext'];
            $defaultvalues['endscreentext'] = array();
            $draftitemid = file_get_submitted_draft_itemid('endscreentext');
            $defaultvalues['endscreentext']['format'] = FORMAT_HTML;
            $defaultvalues['endscreentext']['itemid'] = $draftitemid;
            $defaultvalues['endscreentext']['text'] = file_prepare_draft_area(
                $draftitemid,
                $this->context->id,
                'mod_interactivevideo',
                'endscreentext',
                0,
                ['subdirs' => 0],
                $text
            );
        }

        $displayoptions = [
            'darkmode',
            'disablechapternavigation',
            'preventskipping',
            'useoriginalvideocontrols',
            'hidemainvideocontrols',
            'preventseeking',
            'disableinteractionclick',
            'disableinteractionclickuntilcompleted',
            'hideinteractions',
        ];
        if (empty($defaultvalues['displayoptions'])) {
            $defaultvalues['displayoptions'] = json_encode(array_fill_keys($displayoptions, 0));
        }
        $defaultdisplayoptions = json_decode($defaultvalues['displayoptions'], true);
        foreach ($displayoptions as $option) {
            $defaultvalues[$option] = !empty($defaultdisplayoptions[$option]) ? $defaultdisplayoptions[$option] : 0;
        }

        $completionpercentageenabledel = 'completionpercentageenabled';
        $completionpercentageel = 'completionpercentage';

        $defaultvalues[$completionpercentageenabledel] = !empty($defaultvalues[$completionpercentageel]) ? 1 : 0;
        if (empty($defaultvalues[$completionpercentageel])) {
            $defaultvalues[$completionpercentageel] = 0;
        }
    }

    /**
     * Custom completion rules should be added here
     *
     * @return array Contains the names of the added form elements
     */
    public function add_completion_rules() {
        $mform = $this->_form;

        $group = [];
        $completionpercentageenabledel = 'completionpercentageenabled';
        $group[] = &$mform->createElement(
            'checkbox',
            $completionpercentageenabledel,
            '',
            get_string('minimumcompletionpercentage', 'interactivevideo')
        );
        $completionpercentageel = 'completionpercentage';
        $group[] = &$mform->createElement('text', $completionpercentageel, '', ['size' => 3]);
        $mform->setType($completionpercentageel, PARAM_INT);
        $completionpercentagegroupel = 'completionpercentagegroup';
        $mform->addGroup($group, $completionpercentagegroupel, '', ' ', false);
        $mform->hideIf($completionpercentageel, $completionpercentageenabledel, 'notchecked');

        return [$completionpercentagegroupel];
    }

    /**
     * Determines if completion is enabled for this module.
     *
     * @param array $data
     * @return bool
     */
    public function completion_rule_enabled($data) {
        return !empty($data['completionpercentageenabled']) && $data['completionpercentage'] > 0;
    }

    /**
     * Custom data should be added here
     * @param stdClass $data
     */
    public function data_postprocessing($data) {
        if (!empty($data->completionunlocked)) {
            $completion = $data->{'completion'};
            $autocompletion = !empty($completion) && $completion == COMPLETION_TRACKING_AUTOMATIC;
            if (empty($data->{'completionpercentageenabled'}) && $autocompletion) {
                $data->{'completionpercentage'} = 0;
            }
        }
    }
}
