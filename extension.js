/*
 * Copyright (C) 2013 Rodrigo Moya.
 *
 * This library is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 2.1 of the License, or
 * (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this library.  If not, see <http://www.gnu.org/licenses/>.
 *
 * Authors: Rodrigo Moya <rodrigo@gnome.org>
 *
 */

const St = imports.gi.St;
const Lang = imports.lang;
const Shell = imports.gi.Shell;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;

const Gettext = imports.gettext.domain('gnome-shell-extensions');
const _ = Gettext.gettext;

const Main = imports.ui.main;
const Panel = imports.ui.panel;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

var tomboyProxy = null;

function getTomboyProxy() {
    if (tomboyProxy == null) {
        try {
            tomboyProxy = new Gio.DBusProxy.new_sync(
                Gio.bus_get_sync (Gio.BusType.SESSION, null),
                Gio.DBusProxyFlags.DO_NOT_CONNECT_SIGNALS,
                null,
                "org.gnome.Tomboy",
                "/org/gnome/Tomboy/RemoteControl",
                "org.gnome.Tomboy.RemoteControl",
                null);
        } catch (err) {
            global.log (err.message);
        }
    }

    return tomboyProxy;
}

function proxyCallSync (method, parameters) {
    var proxy = getTomboyProxy();
    if (proxy != null) {
        try {
            return proxy.call_sync (method, parameters, 0, -1, null);
        } catch (err) {
            global.log(err.message);
        }
    }

    return null;
}

const TomboyNoteMenuItem = new Lang.Class({
    Name: 'TomboyNoteMenuItem',
    Extends: PopupMenu.PopupBaseMenuItem,

    _init: function(note_url) {
        this.parent();

        this._note_url = note_url;

        var title = proxyCallSync ("GetNoteTitle",
                                   GLib.Variant.new ('(s)', [ this._note_url ]));
        if (title)
            this._title = title.deep_unpack ()[0];
        else
            this._title = this._note_url;

        this.label = new St.Label({ text: this._title });
        this.addActor (this.label);
    },

    activate: function (event) {
        proxyCallSync("DisplayNote",
                      GLib.Variant.new ('(s)', [ this._note_url ]));

        this.parent (event);
    }
});

const TomboyPanelMenu = new Lang.Class({
    Name: 'Tomboy.PanelMenu',
    Extends: PanelMenu.SystemStatusButton,

    _init: function() {
        this.parent('folder-documents');

        var menu_item;

        menu_item = new PopupMenu.PopupMenuItem(_("New note"));
        menu_item.connect('clicked', Lang.bind(this, this._new_note));
        this.menu.addMenuItem(menu_item);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        /* Section for notes menu items */
        this._contentSection = new PopupMenu.PopupMenuSection();
        this.menu.addMenuItem(this._contentSection);

        /* Separator */
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        /* 'Search' menu item */
        menu_item = new PopupMenu.PopupMenuItem(_("Search notes"));
        menu_item.connect('clicked', Lang.bind(this, this._run_search));
        this.menu.addMenuItem(menu_item);

        var proxy = getTomboyProxy ();
        if (proxy != null) {
            /* Add notes now */
            this._update();
            this.actor.show();
        } else {
            global.log("Tomboy DBus RemoteControl interface not available");
            this.hide();
        }
    },

    _new_note: function() {
        //proxyCallSync ("CreateNote", null);
    },

    _run_search: function() {
        proxyCallSync ("DisplaySearch", null);
    },

    _update: function() {
        this._contentSection.removeAll();

        var notes = proxyCallSync ("ListAllNotes", null).get_child_value (0);
        for (var i = 0; i < notes.n_children(); i++) {
            var note_url = notes.get_child_value(i);

            this._contentSection.addMenuItem (new TomboyNoteMenuItem (note_url.deep_unpack ()));
        }
    },
});

function init() {
}

let _indicator;

function enable() {
    _indicator = new TomboyPanelMenu;
    Main.panel.addToStatusArea('tomboy-menu', _indicator);
}

function disable() {
    _indicator.destroy();
}
