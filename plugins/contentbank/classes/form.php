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
use moodle_url;
use core_contentbank\contentbank;
/**
 * Class form
 *
 * @package    ivplugin_contentbank
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class form extends \mod_interactivevideo\form\base_form {
    /**
     * Sets data for dynamic submission
     * @return void
     */
    public function set_data_for_dynamic_submission(): void {
        $data = $this->set_data_default();

        $this->set_data($data);
    }

    /**
     * Form definition
     *
     * @return void
     */
    public function definition() {
        global $COURSE, $OUTPUT;

        $mform = &$this->_form;

        $this->standard_elements();

        $mform->addElement('text', 'title', '<i class="bi bi-quote mx-2"></i>' . get_string('title', 'mod_interactivevideo'));
        $mform->setType('title', PARAM_TEXT);
        $mform->setDefault('title', get_string('defaulttitle', 'mod_interactivevideo'));
        $mform->addRule('title', get_string('required'), 'required', null, 'client');

        $mform->addElement('hidden', 'contentid', null);
        $mform->setType('contentid', PARAM_INT);

        $coursecontext = \context_course::instance($COURSE->id);
        $cb = new contentbank();
        // Prepare the toolbar.
        $toolbar = '<div class="contentbank-toolbar bg-gray p-2 d-flex align-items-center justify-content-between rounded-top">
            <span class="font-weight-bold text-truncate mx-2">'
            . get_string('selectoruploadcontent', 'ivplugin_contentbank') . '</span>';

        $contenttypes = [];

        if (has_capability('moodle/contentbank:useeditor', $coursecontext)) {
            $enabledcontenttypes = $cb->get_enabled_content_types();
            foreach ($enabledcontenttypes as $contenttypename) {
                $contenttypeclass = "\\contenttype_$contenttypename\\contenttype";
                $contenttype = new $contenttypeclass($coursecontext);
                if ($contenttype->can_access()) {
                    $contenttypelibraries = $contenttype->get_contenttype_types();
                    if (!empty($contenttypelibraries)) {
                        foreach ($contenttypelibraries as $contenttypelibrary) {
                            $contenttypelibrary->type = $contenttypename;
                            $contenttypes[] = $contenttypelibrary;
                        }
                    }
                }
            }

            if (!empty($contenttypes)) {
                $toolbar .= '<div class="dropdown ml-auto">
                                <button class="btn btn-primary text-uppercase dropdown-toggle" type="button" id="addnewcontent"
                                data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                <i class="bi bi-plus-lg mr-2"></i>' . get_string('add', 'ivplugin_contentbank') . '
                                </button>
                                <div class="dropdown-menu dropdown-menu-right" id="addnewcontentdropdown"
                                aria-labelledby="addnewcontent">';
                foreach ($contenttypes as $type) {
                    $icon = $type->typeicon;
                    $url = new moodle_url('/contentbank/edit.php', [
                        'contextid' => $coursecontext->id,
                        'plugin' => $type->type,
                        'library' => $type->key,
                    ]);
                    if (empty($icon)) {
                        $icon = $OUTPUT->pix_icon(
                            'b/' . $type->type . '_library',
                            '',
                            'core',
                            ['class' => 'contentbank-itemlist-icon']
                        );
                    } else {
                        $icon = '<img class="contentbank-itemlist-icon" src="' . $icon . '"/>';
                    }
                    $toolbar .= '<a class="dropdown-item" target="_blank" href="' . $url
                        . '" data-library="' . $type->typeeditorparams .  '">' . $icon . $type->typename . '</a>';
                }
                $toolbar .= '</div></div>';
            }
        }

        // Upload button.
        if (has_capability('moodle/contentbank:upload', $coursecontext)) {
            $toolbar .= '<div class="btn btn-secondary ' . (empty($contenttypes) ? 'ml-auto' : 'ml-2') .
                '" id="uploadcontentbank" data-toggle="tooltip" data-trigger="hover"  data-title="'
                . get_string('upload', 'ivplugin_contentbank')
                . '"><i class="bi bi-upload"></i></div>';
        }

        // Refresh button.
        $toolbar .= '<div class="btn btn-secondary ml-2"
            id="refreshcontentbank" data-toggle="tooltip" data-editable="'
            . has_capability('moodle/contentbank:useeditor', $coursecontext) . '" data-trigger="hover" data-title="'
            . get_string('resync', 'ivplugin_contentbank')
            . '"><i class="bi bi-arrow-repeat"></i></div></div>';

        // Prepare the content list.
        $foldercontents = $cb->search_contents('', $coursecontext->id);
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

        $html = '<div class="contentbank-container rounded-bottom">';

        foreach ($contents as $content) {
            $editurl = new moodle_url(
                '/contentbank/edit.php',
                ['contextid' => $coursecontext->id, 'id' => $content['id'], 'plugin' => $content['type']]
            );

            $html .= '<div class="contentbank-item d-flex align-items-center p-1 '
                . ($content['id'] == $this->optional_param('contentid', null, PARAM_INT) ? "selected" : "")
                . ' " data-contentid="' . $content['id']
                . '"><div class="contentbank-item-details d-flex align-items-center">';

            if ($content['icon']) {
                $html .= '<div class="contentbank-item-icon ml-3 mr-3" style="background-image: url('
                    . $content['icon']
                    . ')"/></div>';
            } else {
                $html .= '<div class="contentbank-item-icon ml-3 mr-3"></div>';
            }

            $html .= '<div class="contentbank-item-name w-100">' . $content['name'] . '</div></div>';
            $html .= '<div class="btn btn-sm ml-auto contentbankview" data-toggle="tooltip"  data-trigger="hover" data-title="'
                . get_string('preview', 'ivplugin_contentbank')
                . '"><i class="bi bi-eye-fill"></i></div>';

            if (has_capability('moodle/contentbank:useeditor', $coursecontext)) {
                $html .= '<a class="btn btn-sm ml-2" target="_blank" data-toggle="tooltip" data-trigger="hover" data-title="'
                    . get_string('edit', 'ivplugin_contentbank')
                    . '" href="' . $editurl . '"><i class="bi bi-pencil-square"></i></a>';
            }

            $html .= '</div>';
        }

        if (empty($contents)) {
            $html .= '<div class="contentbank-item text-center p-2">'
                . get_string('nocontentfound', 'ivplugin_contentbank')
                . '</div>';
        }
        $html .= '</div>';

        $mform->addElement('html', '<div class="contentbank contentbank rounded border border-secondary">'
            . $toolbar . $html . '</div><div id="contentbank-preview" class="mt-3"></div>');

        $mform->addElement('static', 'contentvalidation', '');

        $this->xp_form_field();
        $this->completion_tracking_field();
        $this->display_options_field();
        $this->advanced_form_fields(true, true, true, true);
        $this->close_form();
    }

    /**
     * Validates form data
     *
     * @param mixed $data
     * @param mixed $files
     * @return void
     */
    public function validation($data, $files) {
        $errors = parent::validation($data, $files);
        if (empty($data['contentid'])) {
            $errors['contentvalidation'] = get_string('required');
        }
        return $errors;
    }

    /**
     * Get the page URL for dynamic submission
     *
     * @return \moodle_url
     */
    protected function get_page_url_for_dynamic_submission(): \moodle_url {
        return new \moodle_url('/contentbank/view.php', [
            'id' => $this->optional_param('id', null, PARAM_INT),
            "contextid" => $this->optional_param("contextid", null, PARAM_INT),
        ]);
    }
}
