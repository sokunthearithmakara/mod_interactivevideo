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

namespace ivplugin_discussion;

/**
 * Class discussion
 *
 * @package    ivplugin_discussion
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class main extends \ivplugin_richtext\main {
    /**
     * Get the property.
     */
    public function get_property() {
        return [
            'name' => 'discussion',
            'title' => get_string('discussioncontent', 'ivplugin_discussion'),
            'icon' => 'bi bi-chat-left-text',
            'amdmodule' => 'ivplugin_discussion/main',
            'class' => 'ivplugin_discussion\\main',
            'form' => 'ivplugin_discussion\\form',
            'hascompletion' => true,
            'hastimestamp' => true,
            'hasreport' => true,
            'description' => get_string('discussiondescription', 'ivplugin_discussion'),
        ];
    }
    /**
     * Get the content.
     * @param array $arg The argument.
     * @return string The content.
     */
    public function get_content($arg) {
        global $CFG;
        $content = $arg["content"];
        $id = $arg["id"];
        $contextid = $arg["contextid"];
        $format = FORMAT_HTML;
        // Process the content from editor for displaying.
        require_once($CFG->libdir . '/filelib.php');
        $content = file_rewrite_pluginfile_urls($content, 'pluginfile.php', $contextid, 'mod_interactivevideo', 'content', $id);
        $options = new \stdClass();
        $options->para = false;
        $options->context = $context;
        $options->overflowdiv = true;
        $content = format_text($content, $format, $options);
        $arg["content"] = $content;
        return json_encode($arg);
    }
}
