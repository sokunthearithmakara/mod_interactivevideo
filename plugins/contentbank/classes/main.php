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

namespace ivplugin_contentbank;
use core_contentbank\contentbank;
/**
 * Class main
 *
 * @package    ivplugin_contentbank
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class main extends \ivplugin_richtext\main {
    /**
     * Get the property.
     */
    public function get_property() {
        return [
            'name' => 'contentbank',
            'title' => get_string('contentbankcontent', 'ivplugin_contentbank'),
            'icon' => 'bi bi-archive',
            'amdmodule' => 'ivplugin_contentbank/main',
            'class' => 'ivplugin_contentbank\\main',
            'form' => 'ivplugin_contentbank\\form',
            'hascompletion' => true,
            'hastimestamp' => true,
            'description' => get_string('contentbankdescription', 'ivplugin_contentbank'),
        ];
    }

    /**
     * Get the content.
     */
    public function get_content($arg) {
        $id = $arg["contentid"];
        $contextid = $arg["contextid"];
        return $this->get_contentbank_content($id, $contextid);
    }

    /**
     * Get content from content bank item.
     *
     * @param int $id
     * @param int $contextid
     * @return string
     */
    public static function get_contentbank_content($id, $contextid) {
        global $PAGE;
        $context = \context::instance_by_id($contextid);
        $PAGE->set_context($context);
        $cb = new contentbank();
        $content = $cb->get_content_from_id($id);
        $type = $content->get_content_type_instance();
        return $type->get_view_content($content);
    }

    /**
     * Get all contents from contentbank.
     *
     * @param int $contextid
     * @return array
     */
    public static function get_contentbank_contents($contextid) {
        global $PAGE;
        $context = \context::instance_by_id($contextid);
        $PAGE->set_context($context);
        $cb = new contentbank();
        $foldercontents = $cb->search_contents('', $contextid);
        $contents = [];
        foreach ($foldercontents as $foldercontent) {
            $contenttype = $foldercontent->get_content_type_instance();
            $contents[] = [
                "id" => $foldercontent->get_id(),
                "name" => $foldercontent->get_name(),
                'icon' => $contenttype->get_icon($foldercontent),
                'type' => $contenttype->get_contenttype_name(),
            ];
        }
        // Sort contents by name.
        usort($contents, function ($a, $b) {
            return strcmp($a['name'], $b['name']);
        });

        return $contents;
    }
}
