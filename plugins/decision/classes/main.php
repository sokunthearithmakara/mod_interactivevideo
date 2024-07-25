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

namespace ivplugin_decision;

/**
 * Class main
 *
 * @package    ivplugin_decision
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class main extends \ivplugin_richtext\main {
    /**
     * Get the property.
     */
    public function get_property() {
        return [
            'name' => 'decision',
            'title' => get_string('decisioncontent', 'ivplugin_decision'),
            'icon' => 'bi bi-signpost-split-fill',
            'amdmodule' => 'ivplugin_decision/main',
            'class' => 'ivplugin_decision\\main',
            'form' => 'ivplugin_decision\\form',
            'hascompletion' => false,
            'hastimestamp' => true,
            'hasreport' => false,
            'description' => get_string('decisiondescription', 'ivplugin_decision'),
        ];
    }

    /**
     * Get the content.
     * @param array $arg The argument.
     * @return string The content.
     */
    public function get_content($arg) {
        $content = $arg['content'];
        $dests = json_decode($content);
        foreach ($dests as $dest) {
            $dest->title = format_string($dest->title);
        }
        $dests = array_values($dests);
        return json_encode($dests);

    }
}
