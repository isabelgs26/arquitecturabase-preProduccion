function ClienteWS() {
    this.socket = undefined;
    this.ini = function () {
        this.socket = io.connect();
    }
    this.ini();
}