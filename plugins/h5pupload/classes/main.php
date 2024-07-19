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

namespace ivplugin_h5pupload;

/**
 * Class main
 *
 * @package    ivplugin_h5pupload
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class main extends \ivplugin_richtext\main {
    /**
     * Get the property.
     */
    public function get_property() {
        return [
            'name' => 'h5pupload',
            'icon' => 'bi bi-file-zip',
            'title' => get_string('h5puploadcontent', 'ivplugin_h5pupload'),
            'amdmodule' => 'ivplugin_h5pupload/main',
            'class' => 'ivplugin_h5pupload\\main',
            'form' => 'ivplugin_h5pupload\\form',
            'hascompletion' => true,
            'hastimestamp' => true,
            'hasreport' => true,
            'description' => get_string('h5puploaddescription', 'ivplugin_h5pupload'),
        ];
    }

    /**
     * Get the content.
     *
     * @param array $arg The arguments.
     * @return string The content.
     */
    public function get_content($arg) {
        $fs = get_file_storage();
        $files = $fs->get_area_files($arg["contextid"], 'mod_interactivevideo', 'content', $arg["id"], 'id DESC', false);
        $file = reset($files);
        if ($file) {
            $url = \moodle_url::make_pluginfile_url(
                $file->get_contextid(),
                $file->get_component(),
                $file->get_filearea(),
                $file->get_itemid(),
                $file->get_filepath(),
                $file->get_filename()
            );
            // Get the file extension.
            $ext = pathinfo($file->get_filename(), PATHINFO_EXTENSION);
            if ($ext == 'h5p') {
                return '<div class="p-sm-3 p-1 w-100 h5p">'
                    . \core_h5p\player::display($url, new \stdClass) . '</div>';
            } else {
                return '<iframe class="h5p" id="iframe" src="'
                    . $url->out()
                    . '" style="width: 100%; height: 100%" frameborder="0" allow="autoplay" class="rounded-0"></iframe>';
            }
        }
        return 'No content found';
    }
}
