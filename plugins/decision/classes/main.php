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
        $html = '<div class="position-absolute decision text-center mx-auto w-100">';
        $html .= '<h5 class="pt-5 pb-3 bg-white" id="decision-q"><i class="mb-2 bi bi-signpost-split-fill"
         style="font-size: 2em"></i><br>' . $arg['formattedtitle'] . '</h5>';
        // Loop through the content and format_string the title.
        foreach ($dests as $order => $dest) {
            $html .= '<a href="javascript:void(0)" data-timestamp="' . $dest->timestamp . '" data-order="' . $order
                . '" class="decision-option btn btn-outline-secondary btn-rounded mb-2 d-flex
             justify-content-between align-items-center mx-auto"><span class="text-truncate">'
                . format_string($dest->title) . '</span><i class="bi bi-chevron-right"></i></a>';
        }
        $html .= '</div>';
        return $html;
    }
}
