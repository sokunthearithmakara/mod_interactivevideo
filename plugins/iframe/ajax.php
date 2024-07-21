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
 * TODO describe file ajax
 *
 * @package    ivplugin_iframe
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);
require_once('../../../../config.php');
$action = required_param('action', PARAM_TEXT);

switch ($action) {
    case 'getoembedinfo':
        $url = required_param('url', PARAM_URL);
        // Send get request to the URL.
        $response = file_get_contents($url);
        if (!$response) {
            require_once($CFG->libdir . '/filelib.php');
            $curl = new curl(['ignoresecurity' => true]);
            $curl->setHeader('Content-Type: application/json');

            $response = $curl->get($url);
        }
        echo $response;
        break;
    case 'getproviders':
        $response = file_get_contents('providers.json');
        echo $response;
        break;
    default:
        throw new moodle_exception('invalidaction', 'error', '', $action);
        break;
}
