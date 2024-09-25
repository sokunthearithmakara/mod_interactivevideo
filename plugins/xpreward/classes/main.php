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

namespace ivplugin_xpreward;

/**
 * Class main
 *
 * @package    ivplugin_xpreward
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class main extends \ivplugin_richtext\main {
    /**
     * Get the property.
     */
    public function get_property() {
        return [
            'name' => 'xpreward',
            'title' => get_string('xprewardcontent', 'ivplugin_xpreward'),
            'icon' => 'bi bi-star',
            'amdmodule' => 'ivplugin_xpreward/main',
            'class' => 'ivplugin_xpreward\\main',
            'form' => 'ivplugin_xpreward\\form',
            'hascompletion' => true,
            'hastimestamp' => true,
            'hasreport' => true,
            'description' => get_string('xprewarddescription', 'ivplugin_xpreward'),
        ];
    }

    /**
     * Get the content.
     *
     * @param array $arg The arguments.
     * @return string The content.
     */
    public function get_content($arg) {
        global $OUTPUT;
        $star = $arg["xp"];
        $icon = $OUTPUT->image_url('star', 'ivplugin_xpreward');
        return '<div id="xpreward" class="text-center shadow bg-white rounded mx-auto overflow-hidden position-absolute
         d-flex flex-column justify-content-between" style="width: min-content;max-height:200px; height: 90%; max-width: 300px;"><img src="' . $icon .
            '" alt="star" class="p-2" style="max-height: calc(100% - 35px);margin: auto;">
          <button id="claimxp" class="btn text-nowrap btn-primary btn-block rounded-0" style="height: 35px;">'
            . get_string('claimxp', 'ivplugin_xpreward', $star) . '</button></div>';
    }
}
