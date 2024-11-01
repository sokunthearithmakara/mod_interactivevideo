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

/**
 * Settings for the interactivevideo module
 *
 * @package    mod_interactivevideo
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
defined('MOODLE_INTERNAL') || die;

$settings = null; // Must first tell Moodle not to add the default node.

$modfolder = new admin_category(
    'modivfolder',
    new lang_string('pluginname', 'mod_interactivevideo'),
    $module->is_enabled() === false
);
$ADMIN->add('modsettings', $modfolder);


// General settings page.
$gsettings = new admin_settingpage('mod_interactivevideo_generalsettings', get_string('generalsettings', 'mod_interactivevideo'));

$gsettings->add(new admin_setting_heading(
    'mod_interactivevideo_generalsettings',
    '',
    '<div class="alert alert-danger">
    <div class="d-flex align-items-center mb-3"><i class="fa fa-info-circle fa-2x mr-2"></i><b>Important notice!</b></div><div>'
        . get_string(
            'generalsettings_desc',
            'mod_interactivevideo',
            'https://github.com/sokunthearithmakara/mod_interactivevideo/issues'
        ) . '</div></div>'
));

// Checkboxes for enabling the content types.
$subplugins = array_keys(core_component::get_plugin_list('ivplugin'));
$contenttypes = [];
foreach ($subplugins as $subplugin) {
    $contenttypes['ivplugin_' . $subplugin] = get_string('pluginname', 'ivplugin_' . $subplugin);
}

// Custom content types.
$customs = get_plugins_with_function('ivplugin');
foreach ($customs as $custom) {
    foreach ($custom as $function) {
        $function = str_replace('_ivplugin', '', $function);
        $contenttypes[$function] = get_string('pluginname', $function)
            . '<span class="badge alert-primary mx-1">' . get_string('external', 'mod_interactivevideo') . '</span>';
    }
}

// Sort the content types by name a-z.
asort($contenttypes);

$gsettings->add(new admin_setting_configmulticheckbox(
    'mod_interactivevideo/enablecontenttypes',
    get_string('enablecontenttypes', 'mod_interactivevideo'),
    get_string('enablecontenttypes_desc', 'mod_interactivevideo'),
    $contenttypes,
    $contenttypes,
));

// Enable source selector.
$gsettings->add(new admin_setting_configmulticheckbox(
    'mod_interactivevideo/videosources',
    get_string('enablevideosources', 'mod_interactivevideo'),
    get_string('enablevideosources_desc', 'mod_interactivevideo'),
    [
        'html5video' => get_string('html5video', 'mod_interactivevideo'),
        'videolink' => get_string('videolink', 'mod_interactivevideo'),
        'dailymotion' => get_string('dailymotion', 'mod_interactivevideo'),
        'vimeo' => get_string('vimeo', 'mod_interactivevideo'),
        'wistia' => get_string('wistia', 'mod_interactivevideo'),
        'yt' => get_string('youtube', 'mod_interactivevideo'),
    ],
    [
        'html5video' => get_string('html5video', 'mod_interactivevideo'),
        'videolink' => get_string('videolink', 'mod_interactivevideo'),
        'dailymotion' => get_string('dailymotion', 'mod_interactivevideo'),
        'vimeo' => get_string('vimeo', 'mod_interactivevideo'),
        'wistia' => get_string('wistia', 'mod_interactivevideo'),
        'yt' => get_string('youtube', 'mod_interactivevideo'),
    ],
));

// Default source.
$gsettings->add(new admin_setting_configselect(
    'mod_interactivevideo/defaultvideosource',
    get_string('defaultvideosource', 'mod_interactivevideo'),
    get_string('defaultvideosource_desc', 'mod_interactivevideo'),
    'file',
    [
        'url' => get_string('url', 'mod_interactivevideo'),
        'file' => get_string('file', 'mod_interactivevideo'),
    ],
));
// Textarea for defining available font families.
$gsettings->add(new admin_setting_configtextarea(
    'mod_interactivevideo/fontfamilies',
    get_string('fontfamilies', 'mod_interactivevideo'),
    get_string('fontfamilies_desc', 'mod_interactivevideo'),
    'Arial=Arial, sans-serif
Comic Sans MS="Comic Sans MS", cursive, sans-serif
Courier New="Courier New", Courier, monospace
Georgia=Georgia, serif
Impact=Impact, Charcoal, sans-serif
Lucida Console="Lucida Console", "Lucida Sans Typewriter", monospace
Palatino="Palatino Linotype", "Book Antiqua", Palatino, serif
Tahoma=Tahoma, sans-serif
Times New Roman="Times New Roman", Times, serif
Trebuchet MS="Trebuchet MS", sans-serif
Verdana=Verdana, sans-serif',
));

$ADMIN->add('modivfolder', $gsettings);

// Default appearance settings page.
$asettings = new admin_settingpage('mod_interactivevideo_appearance', get_string('appearancesettings', 'mod_interactivevideo'));
$asettings->add(new admin_setting_configmulticheckbox(
    'mod_interactivevideo/defaultappearance',
    get_string('defaultappearance', 'mod_interactivevideo'),
    get_string('defaultappearance_desc', 'mod_interactivevideo'),
    [
        'displayinline' => get_string('displayinline', 'mod_interactivevideo'),
        'launchinpopup' => get_string('launchinpopup', 'mod_interactivevideo'),
        'columnlayout' => get_string('usecolumnlayout', 'mod_interactivevideo'),
        'showprogressbar' => get_string('showprogressbar', 'mod_interactivevideo'),
        'showcompletionrequirements' => get_string('showcompletionrequirements', 'mod_interactivevideo'),
        'showposterimage' => get_string('showposterimage', 'mod_interactivevideo'),
        'showname' => get_string('showname', 'mod_interactivevideo'),
        'distractionfreemode' => get_string('distractionfreemode', 'mod_interactivevideo'),
        'darkmode' => get_string('darkmode', 'mod_interactivevideo'),
    ],
    [
        'displayinline' => get_string('displayinline', 'mod_interactivevideo'),
        'launchinpopup' => get_string('launchinpopup', 'mod_interactivevideo'),
        'cardonly' => get_string('usecardonlydesign', 'mod_interactivevideo'),
        'columnlayout' => get_string('usecolumnlayout', 'mod_interactivevideo'),
        'showprogressbar' => get_string('showprogressbar', 'mod_interactivevideo'),
        'showcompletionrequirements' => get_string('showcompletionrequirements', 'mod_interactivevideo'),
        'showposterimage' => get_string('showposterimage', 'mod_interactivevideo'),
        'showname' => get_string('showname', 'mod_interactivevideo'),
        'showposterimageright' => get_string('showposterimageright', 'mod_interactivevideo'),
        'distractionfreemode' => get_string('distractionfreemode', 'mod_interactivevideo'),
        'darkmode' => get_string('darkmode', 'mod_interactivevideo'),
        'usefixedratio' => get_string('usefixedratio', 'mod_interactivevideo'),
        'disablechapternavigation' => get_string('disablechapternavigation', 'mod_interactivevideo'),
        'useoriginalvideocontrols' => get_string('useoriginalvideocontrols', 'mod_interactivevideo'),
        'hidemainvideocontrols' => get_string('hidemainvideocontrols', 'mod_interactivevideo'),
        'hideinteractions' => get_string('hideinteractions', 'mod_interactivevideo'),
    ],
));

$asettings->add(new admin_setting_configselect(
    'mod_interactivevideo/cardsize',
    get_string('cardsize', 'mod_interactivevideo'),
    get_string('cardsize_desc', 'mod_interactivevideo'),
    'large',
    [
        'large' => '100%',
        'largemedium' => '75%',
        'mediumlarge' => '67%',
        'medium' => '50%',
        'small' => '33%',
        'tiny' => '25%',
    ],
));

$ADMIN->add('modivfolder', $asettings);

// Behaviorsettings settings page.
$bsettings = new admin_settingpage(
    'mod_interactivevideo_behaviorsettings',
    get_string('behaviorsettings', 'mod_interactivevideo')
);

$bsettings->add(new admin_setting_configmulticheckbox(
    'mod_interactivevideo/defaultbehavior',
    get_string('defaultbehavior', 'mod_interactivevideo'),
    get_string('defaultbehavior_desc', 'mod_interactivevideo'),
    [
        'autoplay' => get_string('autoplay', 'mod_interactivevideo'),
        'pauseonblur' => get_string('pauseonblur', 'mod_interactivevideo'),
    ],
    [
        'autoplay' => get_string('autoplay', 'mod_interactivevideo'),
        'pauseonblur' => get_string('pauseonblur', 'mod_interactivevideo'),
        'preventskipping' => get_string('preventskipping', 'mod_interactivevideo'),
        'preventseeking' => get_string('preventseeking', 'mod_interactivevideo'),
        'disableinteractionclick' => get_string('disableinteractionclick', 'mod_interactivevideo'),
        'disableinteractionclickuntilcompleted' => get_string('disableinteractionclickuntilcompleted', 'mod_interactivevideo'),
    ],
));

$ADMIN->add('modivfolder', $bsettings);

// Content types node.
$modcontenttype = new admin_category(
    'modivcontenttype',
    get_string('contenttype', 'mod_interactivevideo'),
    $module->is_enabled() === false
);
$ADMIN->add('modivfolder', $modcontenttype);
