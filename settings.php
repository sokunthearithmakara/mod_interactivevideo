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

if ($ADMIN->fulltree) {
    // Checkboxes for enabling the content types.
    $settings->add(new admin_setting_configmulticheckbox(
        'mod_interactivevideo/enablecontenttypes',
        get_string('enablecontenttypes', 'mod_interactivevideo'),
        get_string('enablecontenttypes_desc', 'mod_interactivevideo'),
        [
            'chapter' => get_string('chaptercontent', 'mod_interactivevideo'),
            'contentbank' => get_string('contentbankcontent', 'mod_interactivevideo'),
            'decision' => get_string('decisioncontent', 'mod_interactivevideo'),
            'form' => get_string('formcontent', 'mod_interactivevideo'),
            'h5pupload' => get_string('h5puploadcontent', 'mod_interactivevideo'),
            'htmlviewer' => get_string('htmlviewercontent', 'mod_interactivevideo'),
            'iframe' => get_string('iframecontent', 'mod_interactivevideo'),
            'inlineannotation' => get_string('inlineannotationcontent', 'mod_interactivevideo'),
            'pdfviewer' => get_string('pdfviewercontent', 'mod_interactivevideo'),
            'richtext' => get_string('richtextcontent', 'mod_interactivevideo'),
            'skipsegment' => get_string('skipsegmentcontent', 'mod_interactivevideo'),
            'xpreward' => get_string('xprewardcontent', 'mod_interactivevideo'),
        ],
        [
            'chapter' => get_string('chaptercontent', 'mod_interactivevideo'),
            'contentbank' => get_string('contentbankcontent', 'mod_interactivevideo'),
            'decision' => get_string('decisioncontent', 'mod_interactivevideo'),
            'form' => get_string('formcontent', 'mod_interactivevideo'),
            'h5pupload' => get_string('h5puploadcontent', 'mod_interactivevideo'),
            'htmlviewer' => get_string('htmlviewercontent', 'mod_interactivevideo'),
            'iframe' => get_string('iframecontent', 'mod_interactivevideo'),
            'inlineannotation' => get_string('inlineannotationcontent', 'mod_interactivevideo'),
            'pdfviewer' => get_string('pdfviewercontent', 'mod_interactivevideo'),
            'richtext' => get_string('richtextcontent', 'mod_interactivevideo'),
            'skipsegment' => get_string('skipsegmentcontent', 'mod_interactivevideo'),
            'xpreward' => get_string('xprewardcontent', 'mod_interactivevideo'),
        ],
    )
    );
}