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
     * Plugins with mform.
     *
     * @var array
     */
    public $subplugins = [];

    /**
     * Constructor for the mod_interactivevideo_mod_form class.
     * @param stdClass $current
     * @param stdClass $section
     * @param stdClass $cm
     * @param stdClass $course
     */
    public function __construct($current, $section, $cm, $course) {
        $allsubplugins = explode(',', get_config('mod_interactivevideo', 'enablecontenttypes'));
        $subpluginclass = [];
        foreach ($allsubplugins as $subplugin) {
            $class = $subplugin . '\\ivmform';
            if (class_exists($class)) {
                $subpluginclass[] = $class;
            }
        }
        $this->subplugins = $subpluginclass;
        parent::__construct($current, $section, $cm, $course);
    }

    /**
     * Defines forms elements
     */
    public function definition() {
        global $CFG, $PAGE, $USER;

        $current = $this->current;

        $mform = $this->_form;

        $videotypes = get_config('mod_interactivevideo', 'videosources');
        $videotypes = explode(',', $videotypes);
        $allowupload = in_array('html5video', $videotypes);
        // Allow link if $videotypes length is greater than 1 after removing html5video.
        $allowlink = count(array_diff($videotypes, ['html5video'])) > 1;

        $url = '';
        if (isset($current->source) && $current->source == 'file') {
            $modulecontext = context_module::instance($current->update);
            $fs = get_file_storage();
            $files = $fs->get_area_files(
                $modulecontext->id,
                'mod_interactivevideo',
                'video',
                0,
                'filesize DESC',
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
            } else {
                $url = '';
            }
        }

        $mform->addElement('hidden', 'videofile', $url);
        $mform->setType('videofile', PARAM_URL);

        $mform->addElement('html', '<div class="mx-auto w-100" style="max-width: 800px;">
            <div id="video-wrapper" class="mt-2 mb-3" style="display: none;">
            <div id="player" style="width:100%; max-width: 100%"></div>
            </div></div>
            <div class="position-fixed w-100 h-100 no-pointer" id="background-loading" style="background: rgba(0, 0, 0, 0.3);">
                        <div class="d-flex h-100 align-items-center justify-content-center">
                            <div class="spinner-border text-danger" style="width: 3rem; height: 3rem;" role="status">
                                <span class="sr-only">Loading...</span>
                            </div>
                        </div>
                    </div>');

        // Adding the "general" fieldset, where all the common settings are shown.
        $mform->addElement('header', 'general', get_string('general', 'form'));

        $mform->addElement('html', '<div id="warning" class="alert alert-warning d-none"><p>'
            . get_string('completiondisablewarning', 'mod_interactivevideo')
            . '</p><input type="submit" class="btn btn-primary" name="unlockcompletion" id="id_unlockcompletion" value="'
            . get_string('unlockcompletion', 'completion') . '"></div>');

        // Add source selection field.
        $source = [];
        if ($allowupload) {
            $source['file'] = get_string('file', 'mod_interactivevideo');
        }
        if ($allowlink) {
            $source['url'] = get_string('url', 'mod_interactivevideo');
        }
        if (count($source) > 1) {
            $mform->addElement('select', 'source', get_string('source', 'mod_interactivevideo'), $source);
            $mform->addRule('source', null, 'required', null, 'client');
        } else {
            $mform->addElement('hidden', 'source', key($source));
        }
        $mform->setType('source', PARAM_TEXT);

        // Uploaded video item id.
        $mform->addElement('hidden', 'video', 0);
        $mform->setType('video', PARAM_INT);

        if ($allowupload) {
            // Add upload button.
            $mform->addElement('button', 'upload', get_string('uploadvideobutton', 'mod_interactivevideo'));
            $mform->hideIf('upload', 'source', 'eq', 'url');

            // Add delete button.
            $mform->addElement('button', 'delete', get_string('deletevideobutton', 'mod_interactivevideo'));
            $mform->hideIf('delete', 'source', 'eq', 'url');
        }

        // Add url field.
        if ($allowlink) {
            // Video source url string.
            $allowedlinks = array_diff($videotypes, ['html5video']);
            $allowedlinks = array_map(function ($link) {
                return get_string($link, 'mod_interactivevideo');
            }, $allowedlinks);
            $allowedlinks = implode(', ', $allowedlinks);
            $attr = [
                'size' => '100',
                'onkeydown' => 'return ((event.ctrlKey || event.metaKey) && event.key === \'v\') ' .
                    ' || ((event.ctrlKey || event.metaKey) && event.key === \'c\') || ' .
                    '((event.ctrlKey || event.metaKey) && event.key === \'x\') || ' .
                    '((event.ctrlKey || event.metaKey) && event.key === \'z\') || ' .
                    '((event.ctrlKey || event.metaKey) && event.key === \'y\') ' .
                    ' || ((event.ctrlKey || event.metaKey) && event.key === \'a\') ' .
                    '|| event.key === \'Backspace\' || event.key === \'Delete\' ? true : false;',
                'placeholder' => get_string('videourlplaceholder', 'mod_interactivevideo', $allowedlinks),
            ];
            if (isset($current->type) && !in_array($current->type, $videotypes)) {
                $attr['disabled'] = 'disabled';
            }
            $mform->addElement(
                'text',
                'videourl',
                get_string('videourl', 'mod_interactivevideo'),
                $attr
            );
            $mform->hideIf('videourl', 'source', 'eq', 'file');
        } else {
            $mform->addElement('hidden', 'videourl', '');
        }
        $mform->setType('videourl', PARAM_TEXT);

        // Poster image url.
        $mform->addElement(
            'hidden',
            'posterimage',
            null
        );

        $mform->setType('posterimage', PARAM_TEXT);

        // Adding the standard "name" field.
        $mform->addElement('text', 'name', get_string('interactivevideoname', 'mod_interactivevideo'), ['size' => '100']);

        if (!empty($CFG->formatstringstriptags)) {
            $mform->setType('name', PARAM_TEXT);
        } else {
            $mform->setType('name', PARAM_CLEANHTML);
        }

        $mform->addRule('name', null, 'required', null, 'client');
        $mform->addRule('name', get_string('maximumchars', '', 255), 'maxlength', 255, 'client');

        // Adding start time and end time fields.
        $mform->addElement(
            'text',
            'startassist',
            get_string('start', 'mod_interactivevideo'),
            ['size' => '100', 'placeholder' => '00:00:00.00']
        );
        $mform->setType('startassist', PARAM_TEXT);
        $mform->setDefault('startassist', "00:00:00");
        $mform->addRule('startassist', null, 'required', null, 'client');
        $mform->addRule(
            'startassist',
            get_string('invalidtimeformat', 'mod_interactivevideo'),
            'regex',
            '/^([0-9]{2}):([0-5][0-9]):([0-5][0-9])(\.\d{2})?$/',
            'client'
        );

        $mform->addElement(
            'text',
            'endassist',
            get_string('end', 'mod_interactivevideo') . '<br><span class="text-muted small" id="videototaltime"></span>',
            ['size' => '100', 'placeholder' => '00:00:00.00']
        );
        $mform->setType('endassist', PARAM_TEXT);
        $mform->setDefault('startassist', "00:00:00");
        $mform->addRule('endassist', null, 'required', null, 'client');
        $mform->addRule(
            'endassist',
            get_string('invalidtimeformat', 'mod_interactivevideo'),
            'regex',
            '/^([0-9]{2}):([0-5][0-9]):([0-5][0-9])(\.\d{2})?$/',
            'client'
        );

        $mform->addElement('hidden', 'start', 0);
        $mform->setType('start', PARAM_FLOAT);
        $mform->addElement('hidden', 'end', 0);
        $mform->setType('end', PARAM_FLOAT);
        $mform->addElement('hidden', 'totaltime', 0);
        $mform->setType('totaltime', PARAM_FLOAT);

        $mform->addElement('hidden', 'type');
        $mform->setType('type', PARAM_TEXT);

        // Adding the standard "intro" and "introformat" fields.
        $this->standard_intro_elements();

        $mform->addElement(
            'advcheckbox',
            'showdescriptiononheader',
            '',
            get_string('displaydescriptiononactivityheader', 'mod_interactivevideo'),
            ['group' => 1],
            [0, 1]
        );

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

        // APPEARANCE AND BEHAVIOR SETTINGS.
        $mform->addElement('header', 'videodisplayoptions', get_string('appearanceandbehaviorsettings', 'mod_interactivevideo'));

        $mform->addElement(
            'html',
            '<div class="form-group row fitem"><div class="col-md-12 col-form-label d-flex pb-0 pr-md-0">
            <h5 class="w-100 border-bottom">' . get_string('appearancesettings', 'mod_interactivevideo')
                . '</h5></div></div>',
        );

        // Set theme.
        $themeobjects = get_list_of_themes();
        $themes = [];
        $themes[''] = get_string('forceno');
        foreach ($themeobjects as $key => $theme) {
            if (empty($theme->hidefromselector)) {
                $themes[$key] = get_string('pluginname', 'theme_' . $theme->name);
            }
        }
        $mform->addElement('select', 'theme', get_string('forcetheme'), $themes);

        // Use custom poster image.
        $mform->addElement(
            'advcheckbox',
            'usecustomposterimage',
            get_string('posterimage', 'mod_interactivevideo'),
            get_string('usecustomposterimage', 'mod_interactivevideo'),
            ['group' => 1],
            [0, 1]
        );

        $mform->addElement(
            'filemanager',
            'posterimagefile',
            '',
            null,
            [
                'subdirs' => 0,
                'maxfiles' => 1,
                'maxbytes' => 500 * 1024,
                'accepted_types' => ['web_image'],
                'return_types' => FILE_INTERNAL,
            ]
        );
        $mform->hideIf('posterimagefile', 'usecustomposterimage', 'eq', 0);

        $htmlgroup = [];
        $htmlgroup[] = $mform->createElement('html', '<hr class="w-100 m-0 border-secondary">');
        $mform->addGroup(
            $htmlgroup,
            'posterimagehr',
            '',
            '',
            false
        );
        $mform->hideIf('posterimagehr', 'usecustomposterimage', 'eq', 0);

        // Show play button on the course page.

        $mform->addElement(
            'advcheckbox',
            'displayinline',
            get_string('activitycard', 'mod_interactivevideo'),
            get_string('displayinline', 'mod_interactivevideo'),
            ['group' => 1],
            [0, 1]
        );

        $mform->addElement(
            'advcheckbox',
            'launchinpopup',
            '',
            get_string('launchinpopup', 'mod_interactivevideo'),
            ['group' => 1],
            [0, 1]
        );
        $mform->hideIf('launchinpopup', 'displayinline', 'eq', 0);

        // Card sizes.
        if ($CFG->branch >= 403) {
            $mform->addElement(
                'static',
                'cardsizeheader',
                '',
                '<b>' . get_string('cardsize', 'mod_interactivevideo') . '</b>'
            );
            $mform->hideIf('cardsizeheader', 'displayinline', 'eq', 0);
        }

        $mform->addElement(
            'select',
            'cardsize',
            $CFG->branch >= 403 ? '' : get_string('cardsize', 'mod_interactivevideo'),
            [
                'large' => '100%',
                'largemedium' => '75%',
                'mediumlarge' => '67%',
                'medium' => '50%',
                'small' => '33%',
                'tiny' => '25%',
            ]
        );

        $mform->hideIf('cardsize', 'displayinline', 'eq', 0);

        // Card only design for small card size.
        $mform->addElement(
            'advcheckbox',
            'cardonly',
            '',
            get_string('usecardonlydesign', 'mod_interactivevideo'),
            ['group' => 1],
            [0, 1]
        );
        $mform->hideIf('cardonly', 'displayinline', 'eq', 0);

        // Column layout.
        $mform->addElement(
            'advcheckbox',
            'columnlayout',
            '',
            get_string('usecolumnlayout', 'mod_interactivevideo'),
            ['group' => 1],
            [0, 1]
        );
        $mform->hideIf('columnlayout', 'displayinline', 'eq', 0);
        $mform->hideIf('columnlayout', 'cardonly', 'eq', 1);

        // Show progress bar.
        $mform->addElement(
            'advcheckbox',
            'showprogressbar',
            '',
            get_string('showprogressbar', 'mod_interactivevideo'),
            ['group' => 1],
            [0, 1]
        );
        $mform->hideIf('showprogressbar', 'displayinline', 'eq', 0);

        // Show completion requirements.
        $mform->addElement(
            'advcheckbox',
            'showcompletionrequirements',
            '',
            get_string('showcompletionrequirements', 'mod_interactivevideo'),
            ['group' => 1],
            [0, 1]
        );
        $mform->hideIf('showcompletionrequirements', 'displayinline', 'eq', 0);

        // Show poster image.
        $mform->addElement(
            'advcheckbox',
            'showposterimage',
            '',
            get_string('showposterimage', 'mod_interactivevideo'),
            ['group' => 1],
            [0, 1]
        );
        $mform->hideIf('showposterimage', 'displayinline', 'eq', 0);
        $mform->hideIf('showposterimage', 'cardonly', 'eq', 1);

        // Show name.
        $mform->addElement(
            'advcheckbox',
            'showname',
            '',
            get_string('showname', 'mod_interactivevideo'),
            ['group' => 1],
            [0, 1]
        );
        $mform->hideIf('showname', 'displayinline', 'eq', 0);

        // Show poster image on the right.
        $mform->addElement(
            'advcheckbox',
            'showposterimageright',
            '',
            get_string('showposterimageright', 'mod_interactivevideo'),
            ['group' => 1],
            [0, 1]
        );
        $mform->hideIf('showposterimageright', 'displayinline', 'eq', 0);
        $mform->hideIf('showposterimageright', 'cardonly', 'eq', 1);

        $mform->addElement(
            'advcheckbox',
            'usecustomdescription',
            '',
            get_string('usecustomdescription', 'mod_interactivevideo'),
            ['group' => 1],
            [0, 1]
        );
        $mform->hideIf('usecustomdescription', 'displayinline', 'eq', 0);
        $mform->hideIf('usecustomdescription', 'cardonly', 'eq', 1);

        if ($CFG->branch >= 403) {
            $mform->addElement(
                'static',
                'customdescriptionheader',
                '',
                '<b>' . get_string('customdescription', 'mod_interactivevideo') . '</b>'
            );
            $mform->hideIf('customdescriptionheader', 'usecustomdescription', 'eq', 0);
            $mform->hideIf('customdescriptionheader', 'displayinline', 'eq', 0);
            $mform->hideIf('customdescriptionheader', 'cardonly', 'eq', 1);
        }

        $mform->addElement(
            'textarea',
            'customdescription',
            $CFG->branch >= 403 ? '' : get_string('customdescription', 'mod_interactivevideo'),
            ['rows' => 5, 'cols' => 100]
        );
        $mform->hideIf('customdescription', 'usecustomdescription', 'eq', 0);
        $mform->hideIf('customdescription', 'displayinline', 'eq', 0);
        $mform->hideIf('customdescription', 'cardonly', 'eq', 1);
        $mform->setType('customdescription', PARAM_RAW);

        $htmlgroup = [];
        $htmlgroup[] = $mform->createElement('html', '<hr class="w-100 m-0 border-secondary">');
        $mform->addGroup(
            $htmlgroup,
            'displayinlinehr',
            '',
            '',
            false
        );
        $mform->hideIf('displayinlinehr', 'displayinline', 'eq', 0);

        // Use distraction-free mode.
        $mform->addElement(
            'advcheckbox',
            'distractionfreemode',
            get_string('player', 'mod_interactivevideo'),
            get_string('distractionfreemode', 'mod_interactivevideo'),
            ['group' => 1],
            [0, 1]
        );

        // Dark mode.
        $mform->addElement(
            'advcheckbox',
            'darkmode',
            '',
            get_string('darkmode', 'mod_interactivevideo'),
            ['group' => 1],
            [0, 1]
        );
        $mform->hideIf('darkmode', 'distractionfreemode', 'eq', 0);

        // Fix aspect ratio.
        $mform->addElement(
            'advcheckbox',
            'usefixedratio',
            '',
            get_string('usefixedratio', 'mod_interactivevideo'),
            ['group' => 1],
            [0, 1]
        );
        $mform->hideIf('userfixedratio', 'distractionfreemode', 'eq', 0);

        // Disable chapter navigation.
        $mform->addElement(
            'advcheckbox',
            'disablechapternavigation',
            '',
            get_string('disablechapternavigation', 'mod_interactivevideo'),
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

        // Hide interactions.
        $mform->addElement(
            'advcheckbox',
            'hideinteractions',
            '',
            get_string('hideinteractions', 'mod_interactivevideo'),
            ['group' => 1],
            [0, 1]
        );

        $mform->hideIf('hideinteractions', 'hidemainvideocontrols', 'eq', 1);

        $mform->addElement(
            'html',
            '<div class="form-group row fitem"><div class="col-md-12 col-form-label d-flex pb-0 pr-md-0">
            <h5 class="w-100 border-bottom">' . get_string('behaviorsettings', 'mod_interactivevideo')
                . '</h5></div></div>',
        );

        // Auto play.
        $mform->addElement(
            'advcheckbox',
            'autoplay',
            '',
            get_string('autoplay', 'mod_interactivevideo'),
            ['group' => 1],
            [0, 1]
        );

        // Pause video if window is not active.
        $mform->addElement(
            'advcheckbox',
            'pauseonblur',
            '',
            get_string('pauseonblur', 'mod_interactivevideo'),
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

        $defaults = get_config('mod_interactivevideo', 'defaultappearance') . ','
            . get_config('mod_interactivevideo', 'defaultbehavior');
        $defaults = explode(',', $defaults);
        $defaultarray = [];
        foreach ($defaults as $default) {
            if (empty($default)) {
                continue;
            }
            $defaultarray[$default] = 1;
        }

        $defaultarray['cardsize'] = get_config('mod_interactivevideo', 'cardsize');
        $defaultarray['source'] = get_config('mod_interactivevideo', 'defaultvideosource');

        $mform->setDefaults($defaultarray);

        // Additional settings from external plugins.
        if (!empty($this->subplugins)) {
            $mform->addElement('header', 'additionalsettings', get_string('additionalsettings', 'mod_interactivevideo'));
            $count = 0;
            foreach ($this->subplugins as $plugin) {
                if (method_exists($plugin, 'definition')) {
                    $additionalfields = $plugin::definition($mform, $current); // Should return true if it has added fields.
                    $count += $additionalfields ? 1 : 0;
                }
            }
            if ($count == 0) {
                $mform->removeElement('additionalsettings');
            }
        }

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
            $videotypes,
        ]);
    }

    /**
     * Custom validation should be added here
     * @param array $data
     * @param array $files
     */
    public function validation($data, $files) {
        global $USER;

        $errors = [];

        // Grade must be greater than 0.
        if ($data['grade'] < 0) {
            $errors['grade'] = get_string('gradenonzero', 'mod_interactivevideo');
        }

        // Gradepass must be less than or equal to grade.
        if ($data['grade'] > 0 && $data['gradepass'] > $data['grade']) {
            $errors['gradepass'] = get_string('gradepassgreaterthangrade', 'grades', $data['grade']);
        }

        // Completion percentage must be between 1 and 100.
        if (isset($data['completionpercentageenabled'])) {
            if (($data['completionpercentage'] <= 0 || $data['completionpercentage'] > 100)) {
                $errors['completionpercentagegroup'] = get_string('completionpercentageerror', 'mod_interactivevideo');
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

        $endtime = explode(':', $data['endassist']);
        $endtime = (int)$endtime[0] * 3600 + (int)$endtime[1] * 60 + (float)$endtime[2] * 1;
        // Roundend to 2 decimal places.
        $endtime = round($endtime, 2, PHP_ROUND_HALF_DOWN);
        $data['end'] = round($data['end'], 2, PHP_ROUND_HALF_DOWN);
        if ($endtime - $data['end'] != 0) {
            $errors['endassist'] = get_string('invalidtimeformat', 'mod_interactivevideo');
        }

        $starttime = explode(':', $data['startassist']);
        $starttime = (int)$starttime[0] * 3600 + (int)$starttime[1] * 60 + (float)$starttime[2] * 1;
        // Roundend to 2 decimal places.
        $starttime = round($starttime, 2, PHP_ROUND_HALF_DOWN);
        $data['start'] = round($data['start'], 2, PHP_ROUND_HALF_DOWN);
        if ($starttime - $data['start'] != 0) {
            $errors['startassist'] = get_string('invalidtimeformat', 'mod_interactivevideo');
        }

        if ($data['usecustomposterimage']) {
            $draftitemid = $data['posterimagefile'];
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
            if (empty($files)) {
                $errors['usecustomposterimage'] = get_string('uploadanimagebelow', 'mod_interactivevideo');
            }
        }

        foreach ($this->subplugins as $plugin) {
            if (!method_exists($plugin, 'validation')) {
                continue;
            }
            try {
                $errors = $plugin::validation($data, $files, $errors);
            } catch (Exception $e) {
                continue;
            }
        }

        return $errors;
    }

    /**
     * Prepare data before applying to populating form.
     * @param array $defaultvalues
     */
    public function data_preprocessing(&$defaultvalues) {
        if ($this->current->instance) {
            // Handle end screen.
            $text = $defaultvalues['endscreentext'] ?? '';
            $defaultvalues['endscreentext'] = [];
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

            // Set file to be used as poster image.
            $draftitemid = file_get_submitted_draft_itemid('posterimagefile') ?? 0;
            file_prepare_draft_area($draftitemid, $this->context->id, 'mod_interactivevideo', 'posterimage', 0, [
                'subdirs' => 0,
                'maxfiles' => 1,
                'maxbytes' => 500 * 1024,
                'accepted_types' => ['web_image'],
                'return_types' => FILE_INTERNAL,
            ]);
            $defaultvalues['posterimagefile'] = $draftitemid;

            // Handle display options.
            $displayoptions = [
                'showdescriptiononheader',
                'darkmode',
                'usefixedratio',
                'disablechapternavigation',
                'preventskipping',
                'useoriginalvideocontrols',
                'hidemainvideocontrols',
                'preventseeking',
                'disableinteractionclick',
                'disableinteractionclickuntilcompleted',
                'hideinteractions',
                'theme',
                'distractionfreemode',
                'usecustomposterimage',
                'displayinline',
                'launchinpopup',
                'cardsize',
                'cardonly',
                'showposterimageright',
                'usecustomdescription',
                'customdescription',
                'showprogressbar',
                'showcompletionrequirements',
                'showposterimage',
                'showname',
                'pauseonblur',
                'autoplay',
                'columnlayout',
            ];
            if (empty($defaultvalues['displayoptions'])) {
                $defaultvalues['displayoptions'] = json_encode(array_fill_keys($displayoptions, 0));
            }
            $defaultdisplayoptions = json_decode($defaultvalues['displayoptions'], true);
            foreach ($displayoptions as $option) {
                $defaultvalues[$option] = !empty($defaultdisplayoptions[$option]) ? $defaultdisplayoptions[$option] : 0;
                if ($option == 'theme' && empty($defaultvalues[$option])) {
                    $defaultvalues[$option] = '';
                }
                if ($option == 'customdescription' && empty($defaultvalues[$option])) {
                    $defaultvalues[$option] = '';
                }
            }

            // Handle completion requirements.
            $defaultvalues['completionpercentageenabled'] = !empty($defaultvalues['completionpercentage']) ? 1 : 0;
            if (empty($defaultvalues['completionpercentage'])) {
                $defaultvalues['completionpercentage'] = 0;
            }

            // Handle subplugin.
            foreach ($this->subplugins as $plugin) {
                if (!method_exists($plugin, 'data_preprocessing')) {
                    continue;
                }
                try {
                    $plugin::data_preprocessing($defaultvalues);
                } catch (Exception $e) {
                    continue;
                }
            }
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
        $mform->disabledIf($completionpercentageel, $completionpercentageenabledel, 'notchecked');

        $return = [$completionpercentagegroupel];

        // Get other elements from plugins.
        foreach ($this->subplugins as $class) {
            if (!method_exists($class, 'customcompletion_definition')) {
                continue;
            }
            try {
                $el = $class::customcompletion_definition($mform);
                $el['element'];
                $return[] = $el['group'];
            } catch (Exception $e) {
                continue;
            }
        }
        return $return;
    }

    /**
     * Determines if completion is enabled for this module.
     *
     * @param array $data
     * @return bool
     */
    public function completion_rule_enabled($data) {
        $hascompletion = false;

        // Default completion.
        if (!isset($data['completionpercentageenabled']) && $data['completionpercentage'] > 0) {
            $hascompletion = true;
        }

        // Get other elements from plugins that extends ivhascompletion.
        foreach ($this->subplugins as $class) {
            if (!method_exists($class, 'completion_rule_enabled')) {
                continue;
            }
            try {
                $hascompletion = $class::completion_rule_enabled($data) ? true : $hascompletion;
            } catch (Exception $e) {
                continue;
            }
        }
        return $hascompletion;
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

            $customcompletion = [];
            foreach ($this->subplugins as $class) {
                if (!method_exists($class, 'data_postprocessing')) {
                    continue;
                }
                try {
                    $customcompletion = $class::data_postprocessing($data, $customcompletion);
                } catch (Exception $e) {
                    continue;
                }
            }

            $data->{'extendedcompletion'} = json_encode($customcompletion);
        }
    }
}
